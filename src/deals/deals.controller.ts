import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un deal' })
  @ApiResponse({ status: 201, description: 'Deal créé avec succès.' })
  create(@Body() createDealDto: CreateDealDto) {
    return this.dealsService.create(createDealDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les deals' })
  @ApiResponse({ status: 200, description: 'Liste des deals.' })
  findAll() {
    return this.dealsService.findAll();
  }

  // ⭐ NEW: Get active deals for a professional
  @Get('professional/:professionalId/active')
  @ApiOperation({ summary: 'Récupérer les deals actifs d\'un professionnel' })
  @ApiParam({ name: 'professionalId', description: 'ID du professionnel' })
  @ApiResponse({ status: 200, description: 'Liste des deals actifs.' })
  findActiveByProfessional(@Param('professionalId') professionalId: string) {
    return this.dealsService.findActiveByProfessional(professionalId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un deal par ID' })
  @ApiParam({ name: 'id', description: "ID du deal" })
  @ApiResponse({ status: 200, description: 'Deal trouvé.' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier un deal" })
  @ApiParam({ name: 'id', description: "ID du deal" })
  @ApiResponse({ status: 200, description: 'Deal mis à jour.' })
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(id, updateDealDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un deal" })
  @ApiResponse({ status: 200, description: 'Deal supprimé.' })
  @ApiParam({ name: 'id', description: "ID du deal" })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
