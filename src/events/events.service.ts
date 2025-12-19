import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private notificationService: NotificationService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const createdEvent = new this.eventModel(createEventDto);
      const savedEvent = await createdEvent.save();

      // Create notification for all users (you can filter by followers or all users)
      // For now, we'll create a notification without a specific userId/professionalId
      // The frontend can fetch all event notifications or filter by user preferences
      try {
        await this.notificationService.createEventNotification(
          (savedEvent._id as any).toString(),
          savedEvent.nom,
          savedEvent.date_debut,
          undefined, // userId - can be set if you want to notify specific users
          (savedEvent as any).organisateur_id, // professionalId if organizer is a professional
          {
            eventId: (savedEvent._id as any).toString(),
            eventName: savedEvent.nom,
            eventDate: savedEvent.date_debut,
            eventLocation: savedEvent.lieu,
            eventCategory: savedEvent.categorie,
          },
        );
      } catch (notifError) {
        console.error('Error creating event notification:', notifError);
        // Don't fail the event creation if notification fails
      }

      return savedEvent;
    } catch (error) {
      console.error('Erreur lors de la création :', error);
      throw error;
    }
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().exec();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new NotFoundException('Événement non trouvé');
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const updated = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Événement non trouvé');
    return updated;
  }

  async remove(id: string): Promise<Event> {
    const deleted = await this.eventModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Événement non trouvé');
    return deleted;
  }
}
