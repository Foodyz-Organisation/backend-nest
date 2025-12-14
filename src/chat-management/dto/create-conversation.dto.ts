import { IsArray, IsOptional, IsString, ArrayMinSize, IsIn } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @IsIn(['private', 'group'])
  kind?: 'private' | 'group';

  @IsArray()
  @ArrayMinSize(1)
  participants: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  meta?: Record<string, any>;
}
