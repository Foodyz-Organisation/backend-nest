import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
@ApiTags('Reclamation')

@Controller('reclamation')
export class ReclamationController {
  constructor(private readonly reclamationService: ReclamationService) {}

  @Post()
    @ApiOperation({ summary: 'Créer un événement' })
  @ApiResponse({ status: 201, description: 'Événement créé avec succès.' })

  create(@Body() createReclamationDto: CreateReclamationDto) {
    return this.reclamationService.create(createReclamationDto);
  }

  @Get()
    @ApiOperation({ summary: 'Lister tous les événements' })
  @ApiResponse({ status: 200, description: 'Liste des événements.' })

  findAll() {
    return this.reclamationService.findAll();
  }

  @Get(':id')
    @ApiOperation({ summary: 'Récupérer un événement par ID' })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement trouvé.' })

  findOne(@Param('id') id: string) {
    return this.reclamationService.findOne(id);
  }

  @Patch(':id')
    @ApiOperation({ summary: "Modifier un événement" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement mis à jour.' })

  update(@Param('id') id: string, @Body() updateReclamationDto: UpdateReclamationDto) {
    return this.reclamationService.update(id, updateReclamationDto);
  }

  @Delete(':id')
    @ApiOperation({ summary: "Supprimer un événement" })
  @ApiParam({ name: 'id', description: "ID de l'événement" })
  @ApiResponse({ status: 200, description: 'Événement supprimé.' })

  remove(@Param('id') id: string) {
    return this.reclamationService.remove(id);
  }
}
