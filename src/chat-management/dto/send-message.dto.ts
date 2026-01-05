import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  type?: 'text' | 'image' | 'file' | 'post' | 'shared_post';
  @IsOptional()
  meta?: Record<string, any>;
}
