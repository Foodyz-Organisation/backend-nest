import { Test, TestingModule } from '@nestjs/testing';
import { ChatManagementService } from './chat-management.service';

describe('ChatManagementService', () => {
  let service: ChatManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatManagementService],
    }).compile();

    service = module.get<ChatManagementService>(ChatManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
