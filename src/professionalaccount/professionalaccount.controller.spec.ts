import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalaccountController } from './professionalaccount.controller';
import { ProfessionalaccountService } from './professionalaccount.service';

describe('ProfessionalaccountController', () => {
  let controller: ProfessionalaccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalaccountController],
      providers: [ProfessionalaccountService],
    }).compile();

    controller = module.get<ProfessionalaccountController>(ProfessionalaccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
