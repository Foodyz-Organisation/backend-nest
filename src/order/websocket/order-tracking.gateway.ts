import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'order-tracking', 
  cors: {
    origin: '*',
  },
})
export class OrderTrackingGateway {
  @WebSocketServer()
  server: Server;

  private activeSharing: Map<string, boolean> = new Map();

  @SubscribeMessage('join-order')
  handleJoinOrder(
    @MessageBody() data: { orderId: string; userType: 'user' | 'pro' },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId, userType } = data;

    client.join(orderId);

    console.log(`Client ${client.id} (${userType}) joined order ${orderId}`);

    this.server.to(orderId).emit('user-joined', {
      userType,
      clientId: client.id,
    });
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
  handleLocationUpdate(
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

    // Broadcast location to the restaurant and other listeners
    this.server.to(orderId).emit('location-update', {
      userId,
      lat,
      lng,
      accuracy: accuracy || null,
      timestamp: Date.now(),
    });
  }
}
