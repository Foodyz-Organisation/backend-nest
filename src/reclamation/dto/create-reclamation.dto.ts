import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReclamationDto {
  @ApiProperty({ description: 'Nom du client' })
  @IsOptional()
  @IsString()
  nomClient?: string;

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

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  restaurantEmail?: string;

  @IsOptional()
  @IsString()
  restaurantId?: string;
}
