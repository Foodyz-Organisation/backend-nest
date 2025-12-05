import { Injectable, BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class FileUploadService {
  private static ensureUploadPath(path: string) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }

  static storage = diskStorage({
    destination: (req, file, cb) => {
      const path = join(process.cwd(), 'filesuploads'); // <-- separate folder
      FileUploadService.ensureUploadPath(path);
      cb(null, path);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = extname(file.originalname);
      cb(null, unique + extension);
    },
  });

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
      storage: this.storage,
      fileFilter: this.fileFilter,
    };
  }
}
