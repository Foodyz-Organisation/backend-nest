// reclamation.controller.ts
import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reclamation')
@Controller('reclamation')
export class ReclamationController {
  constructor(private readonly reclamationService: ReclamationService) {}

  @Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
create(
  @Body() createReclamationDto: CreateReclamationDto,
  @CurrentUser() user: any,
) {
  console.log('🔐 User from token:', user);
  console.log('📝 DTO received:', createReclamationDto);

  // ✅ Fusion correcte des données : le userId vient de JwtStrategy
  const finalData = {
    ...createReclamationDto,
    nomClient: user.nomPrenom || user.username || 'Utilisateur',
    emailClient: user.email,
    userId: user.userId,   // ✅ CORRECTION ICI
  };

  console.log('💾 Final data to save:', finalData);
  return this.reclamationService.create(finalData);
}

  
  // ✅ NOUVELLE ROUTE: Récupérer MES réclamations
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my-reclamations')
 getMyReclamations(@CurrentUser() user: any) {
  const userId = user.userId;

  console.log('📋 Fetching reclamations for userId:', userId);

  return this.reclamationService.findByUserId(userId);
}

  

  @Get()
  findAll() {
    return this.reclamationService.findAll();
  }
}