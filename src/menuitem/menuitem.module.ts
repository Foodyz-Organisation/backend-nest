import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemService } from './menuitem.service';
import { MenuItemController } from './menuitem.controller';
import { MenuItem, MenuItemSchema } from './schema/menuitem.schema';
import { ImageUploadService } from './imageuploadservice';
import { Deals, DealsSchema } from '../deals/schemas/deals.schema'; // ⭐ Import Deals
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Deals.name, schema: DealsSchema }, // ⭐ Add Deals model
    ]),
    GeminiModule,
  ],
  controllers: [MenuItemController],
  providers: [MenuItemService, ImageUploadService],
  exports: [
    MongooseModule,      // <-- THIS EXPORTS MenuItemModel
    MenuItemService,     // <-- Optional but recommended
  ],
})
export class MenuitemModule { }
