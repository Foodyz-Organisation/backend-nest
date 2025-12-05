import { Test, TestingModule } from '@nestjs/testing';
import { ChatManagementGateway } from './chat-management.gateway';

describe('ChatManagementGateway', () => {
  let gateway: ChatManagementGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatManagementGateway],
    }).compile();

    gateway = module.get<ChatManagementGateway>(ChatManagementGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
