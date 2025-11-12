import { Injectable } from '@nestjs/common';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Reclamation } from './entities/reclamation.entity';
import { Model } from 'mongoose';
import { ReclamationDocument } from './schemas/reclamation.schema';
import {  NotFoundException } from '@nestjs/common';

@Injectable()
export class ReclamationService {
  constructor(
    @InjectModel(Reclamation.name) private reclamationModel: Model<ReclamationDocument>,
  ) {}
  async create(createReclamationDto: CreateReclamationDto) {
try {
      const createdRecalamtion = new this.reclamationModel(createReclamationDto);
      return await createdRecalamtion.save();
    } catch (error) {
      console.error('Erreur lors de la création :', error);
      throw error;
    }  }

  async findAll() {
    return this.reclamationModel.find().exec();
  }

  async findOne(id: string) {
const event = await this.reclamationModel.findById(id).exec();
    if (!event) throw new NotFoundException('Événement non trouvé');
    return event;  }

  async update(id: string, updateReclamationDto: UpdateReclamationDto) {
 const updated = await this.reclamationModel
      .findByIdAndUpdate(id, updateReclamationDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Événement non trouvé');
    return updated;  }

  async remove(id : string) {
 const deleted = await this.reclamationModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Événement non trouvé');
    return deleted;  }
}
