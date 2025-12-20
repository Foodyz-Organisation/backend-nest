import { Injectable, BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

@Injectable()
export class ImageUploadService {
  static fileFilter = (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new BadRequestException('Only image files are allowed!'), false);
    }
    callback(null, true);
  };

  static getMulterConfig() {
    return {
      storage: memoryStorage(), // Use memory storage for Supabase uploads
      fileFilter: this.fileFilter,
    };
  }
}