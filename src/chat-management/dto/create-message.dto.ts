import { IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  type?: 'text' | 'image' | 'file';

  @IsOptional()
  meta?: Record<string, any>;
}
