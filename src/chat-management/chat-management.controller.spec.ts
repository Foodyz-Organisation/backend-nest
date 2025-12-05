import { Test, TestingModule } from '@nestjs/testing';
import { ChatManagementController } from './chat-management.controller';

describe('ChatManagementController', () => {
  let controller: ChatManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatManagementController],
    }).compile();

    controller = module.get<ChatManagementController>(ChatManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
