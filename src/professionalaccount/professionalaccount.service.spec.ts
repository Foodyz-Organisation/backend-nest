import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalaccountService } from './professionalaccount.service';

describe('ProfessionalaccountService', () => {
  let service: ProfessionalaccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfessionalaccountService],
    }).compile();

    service = module.get<ProfessionalaccountService>(ProfessionalaccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
