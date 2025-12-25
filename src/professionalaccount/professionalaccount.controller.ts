import { Controller, Get, Post, Patch, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { ProfessionalService } from './professionalaccount.service';
import { CreateProfessionalDto } from './dto/create-professionalaccount.dto';
import { UpdateProfessionalDto } from './dto/update-professionalaccount.dto';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { TunisianLicenseValidatorService } from './tunisian-license-validator.service';

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalController {
  constructor(
    private readonly profService: ProfessionalService,
    private readonly licenseValidator: TunisianLicenseValidatorService,
  ) {}

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

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    const decodedName = decodeURIComponent(name);
    return this.profService.findByName(decodedName);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProfessionalDto) {
    return this.profService.update(id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.profService.toggleActive(id);
  }

  // ========== Test Restaurant Permit Validation (Base64) ==========
  @ApiOperation({ 
    summary: 'Test restaurant permit validation with base64 image',
    description: 'Validate a Tunisian restaurant operation permit (Autorisation d\'exploitation d\'un restaurant) without creating an account. Useful for testing OCR functionality.'
  })
  @ApiResponse({ status: 200, description: 'Restaurant permit validated successfully' })
  @ApiResponse({ status: 400, description: 'Restaurant permit validation failed' })
  @Post('validate-restaurant-permit')
  async validateLicense(@Body() dto: ValidateLicenseDto) {
    return this.licenseValidator.validateLicenseFromBase64(dto.licenseImage);
  }

  // ========== Test Restaurant Permit Validation (File Upload) ==========
  @ApiOperation({ 
    summary: 'Test restaurant permit validation with file upload',
    description: 'Upload a restaurant permit image file to test OCR validation'
  })
  @ApiResponse({ status: 200, description: 'Restaurant permit validated successfully' })
  @ApiResponse({ status: 400, description: 'Restaurant permit validation failed' })
  @ApiConsumes('multipart/form-data')
  @Post('validate-restaurant-permit-file')
  @UseInterceptors(FileInterceptor('file'))
  async validateLicenseFile(@UploadedFile() file: Express.Multer.File) {
    return this.licenseValidator.validateLicenseFromFile(file);
  }
}
