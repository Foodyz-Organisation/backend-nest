import { Module } from '@nestjs/common';
import { MealScannerController } from './meal-scanner.controller';
import { MealScannerService } from './meal-scanner.service';

@Module({
  controllers: [MealScannerController],
  providers: [MealScannerService],
  exports: [MealScannerService],
})
export class MealScannerModule {}
