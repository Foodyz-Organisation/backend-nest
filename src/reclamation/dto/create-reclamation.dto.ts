// dto/create-reclamation.dto.ts
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReclamationDto {
  @ApiProperty({ description: 'Description de la réclamation' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Numéro de commande concernée' })
  @IsNotEmpty()
  @IsString()
  commandeConcernee: string;

  @ApiProperty({ description: 'Type de réclamation' })
  @IsNotEmpty()
  @IsString()
  complaintType: string;

  @ApiProperty({ description: 'Liste des photos (URLs)', required: false })
  @IsOptional()
  @IsArray()
  photos?: string[];
    userId?: string; // ✅ AJOUT (rempli automatiquement par le controller)

}