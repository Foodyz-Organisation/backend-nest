import { IsString, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  type?: 'text' | 'image' | 'file' | 'post' | 'shared_post';

  @IsOptional()
  meta?: Record<string, any>;
}
