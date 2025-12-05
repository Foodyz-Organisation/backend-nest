import { IsNumber, IsPositive } from 'class-validator';

export class UpdateCartItemQuantityDto {
  @IsNumber()
  @IsPositive()
  quantity: number;
}
