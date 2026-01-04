import { IsNotEmpty, IsMongoId, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class EstimateOrderItemDto {
    @IsMongoId()
    @IsNotEmpty()
    menuItemId: string;

    @IsNotEmpty()
    @IsNumber()
    quantity: number;
}

export class TimeEstimationRequestDto {
    @IsMongoId()
    @IsNotEmpty()
    professionalId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EstimateOrderItemDto)
    items: EstimateOrderItemDto[];
}
