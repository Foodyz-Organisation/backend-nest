import { IsArray, IsOptional, IsString, ArrayMinSize, IsIn } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsIn(['private', 'group'])
  kind: 'private' | 'group';

  @IsArray()
  @ArrayMinSize(2)
  participants: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  meta?: Record<string, any>;
}
