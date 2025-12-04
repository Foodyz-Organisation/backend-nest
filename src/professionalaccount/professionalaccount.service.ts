import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProfessionalAccount, ProfessionalDocument } from './schema/professionalaccount.schema';
import { CreateProfessionalDto } from './dto/create-professionalaccount.dto';
import { UpdateProfessionalDto } from './dto/update-professionalaccount.dto';

@Injectable()
export class ProfessionalService {
  constructor(
    @InjectModel(ProfessionalAccount.name) private profModel: Model<ProfessionalDocument>
  ) {}

  // Create professional account
  async create(createDto: CreateProfessionalDto): Promise<ProfessionalAccount> {
    const created = new this.profModel({
      email: createDto.email,
      password: createDto.password,
      role: 'professional',
      isActive: true,
      professionalData: {
        fullName: createDto.fullName || '',
        licenseNumber: createDto.licenseNumber || '',
        ocrVerified: false,
        documents: [],
      },
      linkedUserId: createDto.linkedUserId ? new Types.ObjectId(createDto.linkedUserId) : undefined,
    });
    return created.save();
  }

  // Find all
  async findAll(): Promise<ProfessionalAccount[]> {
    return this.profModel.find().exec();
  }

  // Find by ID
  async findOne(id: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  // Find by email
  async findByEmail(email: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findOne({ email }).exec();
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  // Update professional
  async update(id: string, updateDto: UpdateProfessionalDto): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');

    if (updateDto.password !== undefined) prof.password = updateDto.password;
    if (updateDto.fullName !== undefined) prof.professionalData.fullName = updateDto.fullName;
    if (updateDto.licenseNumber !== undefined) prof.professionalData.licenseNumber = updateDto.licenseNumber;
    if (updateDto.ocrVerified !== undefined) prof.professionalData.ocrVerified = updateDto.ocrVerified;

    return prof.save();
  }

  // Toggle active status
  async toggleActive(id: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');

    prof.isActive = !prof.isActive;
    return prof.save();
  }
}
