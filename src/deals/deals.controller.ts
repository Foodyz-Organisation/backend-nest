import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { ImageUploadService } from '../menuitem/imageuploadservice';
import { plainToInstance } from 'class-transformer';

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', ImageUploadService.getMulterConfig()))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Créer un deal (avec upload d\'image ou URL d\'image)' })
  @ApiResponse({ status: 201, description: 'Deal créé avec succès.' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    let createDealDto: CreateDealDto;
    
    // Check if body is JSON (direct) or form-data
    if (body.createDealDto) {
      // Form-data format
      try {
        createDealDto = plainToInstance(
          CreateDealDto,
          JSON.parse(body.createDealDto),
        );
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new BadRequestException('The DTO payload is not valid JSON.');
      }
    } else {
      // Direct JSON format
      createDealDto = plainToInstance(CreateDealDto, body);
    }

    // Upload image to Supabase if file is provided
    if (file) {
      const imageUrl = await this.supabaseStorageService.uploadFile(file, 'deals');
      createDealDto.image = imageUrl;
    } else if (!createDealDto.image) {
      // If no file and no image URL provided, throw error
      throw new BadRequestException('Image file or image URL is required.');
    }
    // If createDealDto.image already has a URL (from frontend), use it as-is

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
  @UseInterceptors(FileInterceptor('image', ImageUploadService.getMulterConfig()))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Modifier un deal (avec upload d'image optionnel)" })
  @ApiParam({ name: 'id', description: "ID du deal" })
  @ApiResponse({ status: 200, description: 'Deal mis à jour.' })
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    let updateDealDto: UpdateDealDto;
    
    try {
      // If body is already an object (JSON), use it directly
      // Otherwise, parse from form-data
      if (typeof body === 'string' || body.updateDealDto) {
        const dtoString = typeof body === 'string' ? body : body.updateDealDto;
        updateDealDto = plainToInstance(UpdateDealDto, JSON.parse(dtoString));
      } else {
        // Direct JSON body
        updateDealDto = plainToInstance(UpdateDealDto, body);
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      // If parsing fails, try to use body directly (might be JSON already)
      updateDealDto = body as UpdateDealDto;
    }

    // Upload new image to Supabase if provided
    if (file) {
      const imageUrl = await this.supabaseStorageService.uploadFile(file, 'deals');
      updateDealDto.image = imageUrl;
    }
    // If no file but image URL in DTO, it will be used as-is

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
