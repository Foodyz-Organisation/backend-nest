import { Injectable, BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path'; // <--- ADD 'join' HERE
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class ImageUploadService {
  private static ensureUploadPath(path: string) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }

  static storage = diskStorage({
    destination: (req, file, cb) => {
      // ⭐️ FIX: Use absolute path to ensure file saves to project root 'uploads' ⭐️
      const path = join(process.cwd(), 'uploads');
      ImageUploadService.ensureUploadPath(path);
      cb(null, path);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = extname(file.originalname);
      cb(null, unique + extension);
    },
  });

  static fileFilter = (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new BadRequestException('Only image files are allowed!'), false);
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