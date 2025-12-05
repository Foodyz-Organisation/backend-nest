// src/posts/dto/create-comment.dto.ts

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'The text content of the comment',
    maxLength: 500,
    example: 'This is a great post!',
  })
  @IsString({ message: 'Comment text must be a string.' })
  @IsNotEmpty({ message: 'Comment text cannot be empty.' })
  @MaxLength(500, { message: 'Comment text cannot exceed 500 characters.' })
  text: string;
}
