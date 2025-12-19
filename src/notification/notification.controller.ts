import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get('user/:userId')
  getByUser(@Param('userId') userId: string) {
    return this.notificationService.getNotificationsByUser(userId);
  }

  @Get('professional/:professionalId')
  getByProfessional(@Param('professionalId') professionalId: string) {
    return this.notificationService.getNotificationsByProfessional(professionalId);
  }

  @Get('unread')
  getUnread(
    @Query('userId') userId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.notificationService.getUnreadNotifications(userId, professionalId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(
    @Query('userId') userId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.notificationService.markAllAsRead(userId, professionalId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.delete(id);
  }

  @Delete()
  deleteAll(
    @Query('userId') userId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.notificationService.deleteAll(userId, professionalId);
  }
}
