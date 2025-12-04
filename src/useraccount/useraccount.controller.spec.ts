import { Test, TestingModule } from '@nestjs/testing';
import { UseraccountController } from './useraccount.controller';
import { UseraccountService } from './useraccount.service';

describe('UseraccountController', () => {
  let controller: UseraccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UseraccountController],
      providers: [UseraccountService],
    }).compile();

    controller = module.get<UseraccountController>(UseraccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
