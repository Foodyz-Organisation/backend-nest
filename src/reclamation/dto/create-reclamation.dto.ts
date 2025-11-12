import { IsString, IsEmail, IsOptional, IsInt, IsUrl } from 'class-validator';

export class CreateReclamationDto {
  @IsString()
  nomClient: string;

  @IsEmail()
  emailClient: string;

  @IsString()
  description: string;

  @IsString()
  commandeConcernee: string;

  @IsString()
  complaintType: string;

  @IsOptional()
  @IsUrl({}, { message: 'L’image doit être une URL valide' })
  image?: string; // 👈 Champ optionnel pour l'image
}
