import { Test, TestingModule } from '@nestjs/testing';
import { MenuitemService } from './menuitem.service';

describe('MenuitemService', () => {
  let service: MenuitemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuitemService],
    }).compile();

    service = module.get<MenuitemService>(MenuitemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
