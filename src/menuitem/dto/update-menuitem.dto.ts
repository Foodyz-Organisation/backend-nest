import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menuitem.dto';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
