import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemService } from './menuitem.service';
import { MenuItemController } from './menuitem.controller';
import { MenuItem, MenuItemSchema } from './schema/menuitem.schema';
import { ImageUploadService } from './imageuploadservice';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [MenuItemController],
  providers: [MenuItemService, ImageUploadService],
  exports: [
    MongooseModule,      // <-- THIS EXPORTS MenuItemModel
    MenuItemService,     // <-- Optional but recommended
  ],
})
export class MenuitemModule {}
