import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_MEDIA_BUCKET_NAME', 'uploads');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('❌ Supabase credentials are missing!');
      throw new Error('Supabase URL and Service Key must be configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('✅ Supabase Storage Service initialized');
  }

  /**
   * Upload a file buffer to Supabase Storage
   * @param filePath The path within the bucket (e.g., 'posts/image.jpg')
   * @param fileBuffer The file buffer to upload
   * @param contentType The MIME type of the file
   * @returns The public URL of the uploaded file
   */
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: true, // Replace if exists
        });

      if (error) {
        this.logger.error(`❌ Error uploading file to Supabase: ${error.message}`);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      this.logger.log(`✅ File uploaded successfully: ${filePath}`);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`❌ Upload failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file from a Multer file object
   * @param file Multer file object
   * @param folder Optional folder path within the bucket (e.g., 'posts', 'reclamations')
   * @returns The public URL of the uploaded file
   */
  async uploadMulterFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const randomString = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    
    const fileExtension = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
    );
    const fileName = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    return this.uploadFile(filePath, file.buffer, file.mimetype);
  }

  /**
   * Upload a base64 image to Supabase Storage
   * @param base64Data Base64 encoded image data (with or without data URI prefix)
   * @param folder Optional folder path within the bucket
   * @param fileName Optional custom file name (without extension)
   * @returns The public URL of the uploaded file
   */
  async uploadBase64Image(
    base64Data: string,
    folder?: string,
    fileName?: string,
  ): Promise<string> {
    let ext = 'jpeg';
    let data = base64Data;

    // Parse data URI if present
    const matchesComplete = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matchesComplete) {
      ext = matchesComplete[1];
      data = matchesComplete[2];
    } else if (!base64Data.startsWith('data:')) {
      // Try to detect format from buffer
      const buffer = Buffer.from(data.replace(/\s/g, ''), 'base64');
      if (buffer[0] === 0xff && buffer[1] === 0xd8) ext = 'jpeg';
      else if (buffer[0] === 0x89 && buffer[1] === 0x50) ext = 'png';
      else if (buffer[0] === 0x47 && buffer[1] === 0x49) ext = 'gif';
      else if (buffer[0] === 0x52 && buffer[1] === 0x49) ext = 'webp';
    } else {
      const matchesSimple = base64Data.match(/^data:image\/(\w+);base64,/);
      if (matchesSimple) {
        ext = matchesSimple[1];
        data = base64Data.split(',')[1];
      }
    }

    const finalFileName =
      fileName || `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filePath = folder
      ? `${folder}/${finalFileName}.${ext}`
      : `${finalFileName}.${ext}`;

    const fileBuffer = Buffer.from(data.replace(/\s/g, ''), 'base64');
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    return this.uploadFile(filePath, fileBuffer, contentType);
  }

  /**
   * Delete a file from Supabase Storage
   * @param filePath The path within the bucket
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        this.logger.error(`❌ Error deleting file from Supabase: ${error.message}`);
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      this.logger.log(`✅ File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`❌ Delete failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get public URL for a file (without uploading)
   * @param filePath The path within the bucket
   * @returns The public URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
}

