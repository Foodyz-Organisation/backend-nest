import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SharePostDto {
  @ApiProperty({
    description: 'The ID of the recipient user (UserAccount or ProfessionalAccount)',
    example: '60c72b2f9b1d8c001c8e4d1a',
  })
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: 'Optional custom message to send along with the shared post. If not provided, only the post image will be shown in the chat.',
    example: 'Check out this amazing dish!',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}

