import { Injectable, BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

@Injectable()
export class FileUploadService {
  static fileFilter = (req, file, callback) => {
    // Allow images + PDFs
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new BadRequestException('Only images and PDFs are allowed!'), false);
    }
    callback(null, true);
  };

  static getMulterConfig() {
    return {
      storage: memoryStorage(),
      fileFilter: this.fileFilter,
    };
  }
}
