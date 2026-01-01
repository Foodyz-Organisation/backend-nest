import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_MEDIA_BUCKET_NAME') || 'uploads';

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.error('❌ Supabase credentials are missing! Please check your .env file.');
      throw new Error('Supabase credentials are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.logger.log('✅ Supabase Storage service initialized');
  }

  /**
   * Upload a file buffer to Supabase Storage
   * @param file - File buffer or Express.Multer.File
   * @param folder - Optional folder path within the bucket (e.g., 'posts', 'profiles', 'reclamations')
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    file: Express.Multer.File | Buffer,
    folder?: string,
    originalFilename?: string,
  ): Promise<string> {
    try {
      let buffer: Buffer;
      let filename: string;
      let mimetype: string;

      if (Buffer.isBuffer(file)) {
        // If it's a raw buffer
        buffer = file;
        filename = originalFilename || `file-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        mimetype = 'application/octet-stream';
      } else {
        // If it's a Multer file
        buffer = file.buffer;
        filename = file.originalname || `file-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        mimetype = file.mimetype;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      const ext = this.getFileExtension(filename);
      const uniqueFilename = `${timestamp}-${randomString}${ext}`;

      // Construct file path
      const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType: mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`❌ Error uploading file to Supabase: ${error.message}`);
        throw new BadRequestException(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      this.logger.log(`✅ File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`❌ Error in uploadFile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @param files - Array of files
   * @param folder - Optional folder path
   * @returns Array of public URLs
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload a base64 image string
   * @param base64String - Base64 encoded image string (with or without data URI prefix)
   * @param folder - Optional folder path
   * @returns Public URL of the uploaded file
   */
  async uploadBase64Image(
    base64String: string,
    folder?: string,
  ): Promise<string> {
    try {
      // Remove data URI prefix if present (e.g., "data:image/png;base64,")
      const base64Data = base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;

      // Decode base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Determine MIME type from base64 string
      let mimetype = 'image/jpeg';
      if (base64String.includes('data:image/png')) {
        mimetype = 'image/png';
      } else if (base64String.includes('data:image/gif')) {
        mimetype = 'image/gif';
      } else if (base64String.includes('data:image/webp')) {
        mimetype = 'image/webp';
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      const ext = mimetype === 'image/png' ? '.png' : mimetype === 'image/gif' ? '.gif' : mimetype === 'image/webp' ? '.webp' : '.jpg';
      const uniqueFilename = `${timestamp}-${randomString}${ext}`;

      // Construct file path
      const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType: mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`❌ Error uploading base64 image to Supabase: ${error.message}`);
        throw new BadRequestException(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      this.logger.log(`✅ Base64 image uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`❌ Error in uploadBase64Image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple base64 images
   * @param base64Strings - Array of base64 encoded image strings
   * @param folder - Optional folder path
   * @returns Array of public URLs
   */
  async uploadBase64Images(
    base64Strings: string[],
    folder?: string,
  ): Promise<string[]> {
    const uploadPromises = base64Strings.map((base64) =>
      this.uploadBase64Image(base64, folder),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Supabase Storage
   * @param filePath - Path to the file (relative to bucket root)
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        this.logger.error(`❌ Error deleting file from Supabase: ${error.message}`);
        throw new BadRequestException(`Failed to delete file: ${error.message}`);
      }

      this.logger.log(`✅ File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`❌ Error in deleteFile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Get public URL for a file path
   * @param filePath - Path to the file (relative to bucket root)
   * @returns Public URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
}





