import { IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class SaveDto {
  @IsNotEmpty()
  userId: Types.ObjectId;

  @IsNotEmpty()
  postId: Types.ObjectId;
}
