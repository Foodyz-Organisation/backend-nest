import { Injectable, BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * ✅ DEDICATED SERVICE: Profile Picture Upload Configuration
 * This service provides a simple multer configuration specifically for profile pictures.
 * NO AI VALIDATION is applied - this is purely for file type validation.
 */
@Injectable()
export class ProfilePictureUploadService {
  /**
   * File filter for profile pictures - only allows image files
   */
  static fileFilter = (req, file, callback) => {
    // Only allow image files
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new BadRequestException('Only image files are allowed for profile pictures!'),
        false,
      );
    }

    // Optional: Check file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > maxSize) {
      return callback(
        new BadRequestException('Profile picture size must be less than 5MB!'),
        false,
      );
    }

    callback(null, true);
  };

  /**
   * Get multer configuration for profile picture uploads
   * @returns Multer configuration object
   */
  static getMulterConfig() {
    return {
      storage: memoryStorage(), // Store in memory (not disk)
      fileFilter: this.fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    };
  }
}

