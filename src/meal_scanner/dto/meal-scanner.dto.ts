import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyzeMealDto {
  @IsString()
  @IsNotEmpty()
  mealDescription: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(120)
  age: number;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsString()
  @IsNotEmpty()
  goal: string;
}

export class RecipeSuggestionsDto {
  @IsString()
  @IsNotEmpty()
  ingredients: string;

  @IsString()
  condition: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(120)
  age: number;
}

export class ExercisePlanDto {
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(120)
  age: number;

  @IsString()
  @IsNotEmpty()
  goal: string;

  @IsString()
  @IsNotEmpty()
  condition: string;
}
