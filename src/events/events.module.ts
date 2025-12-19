import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Event } from './entities/event.entity';
import { EventSchema } from './schemas/event.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    NotificationModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
