import { Test, TestingModule } from '@nestjs/testing';
import { UseraccountService } from './useraccount.service';

describe('UseraccountService', () => {
  let service: UseraccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UseraccountService],
    }).compile();

    service = module.get<UseraccountService>(UseraccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
