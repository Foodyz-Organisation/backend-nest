import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProfessionalAccount,
  ProfessionalDocument
} from './schema/professionalaccount.schema';
import { CreateProfessionalDto } from './dto/create-professionalaccount.dto';
import { UpdateProfessionalDto } from './dto/update-professionalaccount.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfessionalService {
  constructor(
    @InjectModel(ProfessionalAccount.name)
    private profModel: Model<ProfessionalDocument>
  ) { }

  // =============================
  // CREATE
  // =============================
  async create(createDto: CreateProfessionalDto): Promise<ProfessionalAccount> {
    if (!createDto.password) throw new Error('Password is required');

    const hashed = await bcrypt.hash(createDto.password, 10);

    const mappedDocuments =
      createDto.documents?.map((p) => ({
        filename: p,
        path: p
      })) || [];

    const created = new this.profModel({
      email: createDto.email,
      password: hashed,
      fullName: createDto.fullName || '',
      licenseNumber: createDto.licenseNumber || '',
      documents: createDto.documents || [], // just strings
      role: 'professional',
      isActive: true,
      linkedUserId: createDto.linkedUserId
        ? new Types.ObjectId(createDto.linkedUserId)
        : undefined,
      locations: createDto.locations || [], // Ensure locations array is set
    });

    return created.save();
  }

  // =============================
  // FIND ALL
  // =============================
  async findAll(): Promise<ProfessionalAccount[]> {
    return this.profModel.find().exec();
  }

  // =============================
  // FIND BY ID
  // =============================
  async findOne(id: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  // =============================
  // FIND BY EMAIL
  // =============================
  async findByEmail(email: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findOne({ email }).exec();
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  // =============================
  // FIND BY NAME
  // =============================
  async findByName(name: string): Promise<ProfessionalAccount[]> {
    return this.profModel
      .find({ fullName: { $regex: new RegExp(name, 'i') } })
      .exec();
  }

  // =============================
  // UPDATE
  // =============================
  async update(
    id: string,
    updateDto: UpdateProfessionalDto
  ): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');

    if (updateDto.password)
      prof.password = await bcrypt.hash(updateDto.password, 10);

    if (updateDto.fullName !== undefined)
      prof.fullName = updateDto.fullName;

    if (updateDto.licenseNumber !== undefined)
      prof.licenseNumber = updateDto.licenseNumber;

    if (updateDto.description !== undefined)
      prof.description = updateDto.description;

    if (updateDto.address !== undefined)
      prof.address = updateDto.address;

    if (updateDto.phone !== undefined)
      prof.phone = updateDto.phone;

    if (updateDto.hours !== undefined)
      prof.hours = updateDto.hours;

    if (updateDto.services !== undefined)
      prof.services = { ...prof.services, ...updateDto.services };

    if (updateDto.imageUrl !== undefined)
      prof.imageUrl = updateDto.imageUrl;

    // ✅ Use static string paths for documents
    if (updateDto.documents !== undefined)
      prof.documents = updateDto.documents;

    // ✅ AJOUTEZ CETTE LIGNE (elle manque actuellement) :
    if (updateDto.profilePictureUrl !== undefined)
      prof.profilePictureUrl = updateDto.profilePictureUrl;

    // ✅ FCM Token support for professionals
    if (updateDto.fcmToken !== undefined)
      prof.fcmToken = updateDto.fcmToken;

    // Update locations if provided
    if (updateDto.locations !== undefined)
      prof.locations = updateDto.locations;

    return prof.save();
  }

  // =============================
  // TOGGLE ACTIVE
  // =============================
  async toggleActive(id: string): Promise<ProfessionalAccount> {
    const prof = await this.profModel.findById(id).exec();
    if (!prof) throw new NotFoundException('Professional not found');

    prof.isActive = !prof.isActive;
    return prof.save();
  }
}
