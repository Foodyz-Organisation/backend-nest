import { IsNotEmpty, IsOptional } from 'class-validator';

export class RespondReclamationDto {
  @IsNotEmpty()
  responseMessage: string;

  @IsOptional()
  newStatus?: string; // 'en_cours' | 'resolue' etc.
}
