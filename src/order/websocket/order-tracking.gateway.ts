import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schema/order.schema';
import { ProfessionalAccount, ProfessionalDocument } from '../../professionalaccount/schema/professionalaccount.schema';
import { calculateDistance } from '../utils/distance.util';
import { NotFoundException, Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'order-tracking',
  cors: {
    origin: '*',
  },
})
export class OrderTrackingGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderTrackingGateway.name);
  private activeSharing: Map<string, boolean> = new Map();
  private restaurantLocations: Map<string, { lat: number; lon: number; name?: string }> = new Map();

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(ProfessionalAccount.name) private professionalModel: Model<ProfessionalDocument>,
  ) { }

  @SubscribeMessage('join-order')
  async handleJoinOrder(
    @MessageBody() data: { orderId: string; userType: 'user' | 'pro' },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, userType } = data;

    try {
      // Fetch order to get professionalId
      const order = await this.orderModel.findById(orderId).lean();
      if (!order) {
        client.emit('error', { message: 'Order not found' });
        return;
      }

      // Fetch professional to get restaurant location
      const professional = await this.professionalModel
        .findById(order.professionalId)
        .lean();

      if (!professional) {
        client.emit('error', { message: 'Professional not found' });
        return;
      }

      // Get first location from professional (or use first available)
      const restaurantLocation = professional.locations?.[0];

      if (restaurantLocation) {
        // Store restaurant location for this order
        this.restaurantLocations.set(orderId, {
          lat: restaurantLocation.lat,
          lon: restaurantLocation.lon,
          name: restaurantLocation.name,
        });

        // Send restaurant location to the client who just joined
        client.emit('restaurant-location', {
          lat: restaurantLocation.lat,
          lon: restaurantLocation.lon,
          name: restaurantLocation.name || professional.fullName || 'Restaurant',
          address: restaurantLocation.address,
        });

        this.logger.log(`Restaurant location sent to ${client.id} for order ${orderId}`);
      } else {
        this.logger.warn(`No location found for professional ${order.professionalId} in order ${orderId}`);
      }

      // Join the order room
      client.join(orderId);

      this.logger.log(`Client ${client.id} (${userType}) joined order ${orderId}`);

      // Notify others in the room
      this.server.to(orderId).emit('user-joined', {
        userType,
        clientId: client.id,
      });
    } catch (error) {
      this.logger.error(`Error in join-order: ${error.message}`, error.stack);
      client.emit('error', { message: 'Failed to join order room' });
    }
  }

  @SubscribeMessage('start-sharing')
  handleStartSharing(
    @MessageBody() data: { orderId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.activeSharing.set(data.orderId, true);

    this.server.to(data.orderId).emit('sharing-started', {
      userId: data.userId,
    });
  }

  // User stops location sharing
  @SubscribeMessage('stop-sharing')
  handleStopSharing(
    @MessageBody() data: { orderId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.activeSharing.set(data.orderId, false);

    this.server.to(data.orderId).emit('sharing-stopped', {
      userId: data.userId,
    });
  }

  // User sends a location update (lat/lng)
  @SubscribeMessage('location-update')
  async handleLocationUpdate(
    @MessageBody()
    data: {
      orderId: string;
      userId: string;
      lat: number;
      lng: number;
      accuracy?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, userId, lat, lng, accuracy } = data;

    // If sharing disabled, ignore
    if (!this.activeSharing.get(orderId)) return;

    // Get restaurant location for distance calculation
    const restaurantLocation = this.restaurantLocations.get(orderId);
    let distance: number | null = null;
    let distanceFormatted: string | null = null;

    if (restaurantLocation) {
      // Calculate distance between user and restaurant
      distance = calculateDistance(
        lat,
        lng,
        restaurantLocation.lat,
        restaurantLocation.lon,
      );

      // Format distance
      if (distance < 1) {
        distanceFormatted = `${Math.round(distance * 1000)} m`;
      } else {
        distanceFormatted = `${distance.toFixed(2)} km`;
      }
    }

    // Broadcast location to the restaurant and other listeners
    this.server.to(orderId).emit('location-update', {
      userId,
      lat,
      lng,
      accuracy: accuracy || null,
      timestamp: Date.now(),
      distance: distance, // Distance in kilometers
      distanceFormatted: distanceFormatted, // Formatted string (e.g., "2.5 km" or "150 m")
      restaurantLocation: restaurantLocation ? {
        lat: restaurantLocation.lat,
        lon: restaurantLocation.lon,
        name: restaurantLocation.name,
      } : null,
    });

    // Persist latest location to database
    try {
      await this.orderModel.findByIdAndUpdate(orderId, {
        userLocation: {
          lat,
          lng,
          lastUpdated: new Date(),
          accuracy: accuracy || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist user location for order ${orderId}: ${error.message}`);
    }
  }

  // User sets estimated arrival time
  @SubscribeMessage('set-eta')
  async handleSetETA(
    @MessageBody()
    data: {
      orderId: string;
      userId: string;
      estimatedMinutes?: number;
      estimatedArrivalTime?: Date;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, userId, estimatedMinutes, estimatedArrivalTime } = data;

    this.logger.log(`User ${userId} set ETA for order ${orderId}: ${estimatedMinutes} minutes`);

    // Broadcast ETA to all clients in order room
    this.server.to(orderId).emit('eta-update', {
      userId,
      estimatedMinutes: estimatedMinutes || null,
      estimatedArrivalTime: estimatedArrivalTime || null,
      timestamp: Date.now(),
    });

    // Persist ETA to database
    try {
      const updateData: any = {};
      if (estimatedMinutes !== undefined) {
        updateData.estimatedArrivalMinutes = estimatedMinutes;
      }
      if (estimatedArrivalTime) {
        updateData.estimatedArrivalTime = estimatedArrivalTime;
      }

      await this.orderModel.findByIdAndUpdate(orderId, updateData);
      this.logger.log(`ETA persisted to database for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to persist ETA for order ${orderId}: ${error.message}`);
    }
  }
}
