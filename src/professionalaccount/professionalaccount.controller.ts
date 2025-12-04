import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ProfessionalService } from './professionalaccount.service';
import { CreateProfessionalDto } from './dto/create-professionalaccount.dto';
import { UpdateProfessionalDto } from './dto/update-professionalaccount.dto';

@Controller('professionals')
export class ProfessionalController {
  constructor(private readonly profService: ProfessionalService) {}

  @Post()
  create(@Body() dto: CreateProfessionalDto) {
    return this.profService.create(dto);
  }

  @Get()
  findAll() {
    return this.profService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profService.findOne(id);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.profService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProfessionalDto) {
    return this.profService.update(id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.profService.toggleActive(id);
  }
}
