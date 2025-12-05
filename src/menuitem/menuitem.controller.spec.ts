import { Test, TestingModule } from '@nestjs/testing';
import { MenuItemController } from './menuitem.controller';
import { MenuItemService } from './menuitem.service';

describe('MenuitemController', () => {
  let controller: MenuItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuItemController],
      providers: [MenuItemService],
    }).compile();

    controller = module.get<MenuItemController>(MenuItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
