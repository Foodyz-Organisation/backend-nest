import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un événement' })
  @ApiResponse({ status: 201, description: 'Événement créé avec succès.' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les événements' })
  @ApiResponse({ status: 200, description: 'Liste des événements.' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un événement par ID' })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement trouvé.' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier un événement" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement mis à jour.' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un événement" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement supprimé.' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
