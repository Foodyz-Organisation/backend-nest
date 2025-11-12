import { IsString, IsDateString, IsOptional, IsInt, IsEnum, IsUrl } from 'class-validator';

export class CreateEventDto {
  @IsString()
  nom: string;

  @IsString()
  description: string;

  @IsDateString()
  date_debut: string; // format ISO (ex: "2025-11-02T10:00:00Z")

  @IsDateString()
  date_fin: string;

  @IsUrl()
  @IsOptional()
  image?: string; // URL de l'image (optionnelle)

  @IsString()
  lieu: string;

  @IsString()
  categorie: string;

  @IsEnum(['à venir', 'en cours', 'terminé'])
  statut: string;
}
