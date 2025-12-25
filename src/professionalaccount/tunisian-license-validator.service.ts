import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfessionalAccount, ProfessionalDocument } from './schema/professionalaccount.schema';
import axios from 'axios';
import FormData from 'form-data';

// Tunisian Restaurant Permit Validation Result
export interface LicenseValidationResult {
  isValid: boolean;
  licenseNumber: string | null; // Permit number
  reason: string;
  extractedText: string;
  confidence: 'high' | 'medium' | 'low';
  tunisianKeywordsFound: string[];
}

@Injectable()
export class TunisianLicenseValidatorService {
  private readonly logger = new Logger(TunisianLicenseValidatorService.name);
  private readonly ocrApiKey: string;

  // Tunisian-specific keywords to look for in restaurant operation permit
  private readonly TUNISIAN_KEYWORDS = [
    'tunisie',
    'tunisia',
    'république tunisienne',
    'republique tunisienne',
    'autorisation',
    'exploitation',
    'restaurant',
    'établissement',
    'etablissement',
    'commerce',
    'tourisme',
    'ministère du commerce',
    'ministere du commerce',
    'ministère du tourisme',
    'ministere du tourisme',
    'الجمهورية التونسية', // Arabic: Tunisian Republic
    'ترخيص', // Arabic: Authorization/License
    'مطعم', // Arabic: Restaurant
    'استغلال', // Arabic: Exploitation/Operation
    'وزارة التجارة', // Arabic: Ministry of Commerce
    'وزارة السياحة', // Arabic: Ministry of Tourism
  ];

  // Regex patterns for Tunisian restaurant permit numbers
  // Restaurant permits typically follow patterns like:
  // - 12345678 (8 digits)
  // - 1234567 (7 digits)
  // - ABC123456 (letters followed by numbers)
  // - 123/2023 (number/year format)
  // - N° 12345 (with N° prefix)
  private readonly LICENSE_NUMBER_PATTERNS = [
    /(?:N°|n°|no|NO)\s*[:\s]*(\d{4,8})/gi, // N° 12345 or No: 12345
    /\b\d{7,8}\b/g, // 7-8 digit numbers
    /\b\d{3,6}[\/\-]\d{4}\b/g, // 123/2023 or 1234-2023
    /\b[A-Z]{1,3}\d{4,7}\b/gi, // A12345 or ABC12345
    /\b\d{2}[\/\-\s]?\d{3}[\/\-\s]?\d{3}\b/g, // Formatted numbers like 12-345-678
  ];

  constructor(
    @InjectModel(ProfessionalAccount.name)
    private profModel: Model<ProfessionalDocument>,
    private configService: ConfigService,
  ) {
    // Get OCR.space API key from environment or use free public key
    this.ocrApiKey = this.configService.get<string>('OCR_API_KEY') || 'K87899142388957';
    this.logger.log('✅ OCR.space API initialized (FREE tier - 25,000 requests/month)');
    this.logger.log(`🔑 Using API Key: ${this.ocrApiKey.substring(0, 8)}...`);
  }

  /**
   * Perform OCR on restaurant permit image using OCR.space API (FREE)
   * Uses dual-language approach for French + Arabic text
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
      this.logger.log('🔍 Performing OCR on restaurant permit image (French + Arabic)...');

      // Convert buffer to base64
      let base64Image = imageBuffer.toString('base64');
      
      // Check file size and compress if needed (OCR.space limit: 1MB)
      const sizeInKB = Math.round((base64Image.length * 3) / 4 / 1024);
      this.logger.log(`📊 Original image size: ${sizeInKB} KB`);
      
      if (sizeInKB > 900) { // Compress if > 900KB (leave some margin)
        this.logger.log('🗜️ Image too large, compressing...');
        base64Image = await this.compressBase64Image(base64Image);
        const newSizeInKB = Math.round((base64Image.length * 3) / 4 / 1024);
        this.logger.log(`✅ Compressed to: ${newSizeInKB} KB`);
      }
      
      const base64WithPrefix = `data:image/jpeg;base64,${base64Image}`;

      // Strategy: Use OCR Engine 2 with 'eng' - it handles both Latin and Arabic scripts
      this.logger.log('📖 Reading mixed French/Arabic text...');
      
      const response = await axios.post(
        'https://api.ocr.space/parse/image',
        {
          apikey: this.ocrApiKey,
          base64Image: base64WithPrefix,
          language: 'eng', // Engine 2 with 'eng' can detect Arabic characters too
          isOverlayRequired: false,
          detectOrientation: true,
          scale: true,
          OCREngine: 2, // Engine 2 is multilingual and handles Arabic
          isTable: false,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000, // 30 seconds
        }
      );

      if (response.data.IsErroredOnProcessing) {
        const errorMessage = response.data.ErrorMessage?.[0] || 'OCR processing failed';
        this.logger.error('❌ OCR.space error:', errorMessage);
        
        // Fallback: Try with Arabic language setting
        this.logger.log('🔄 Retrying with Arabic language setting...');
        return this.extractTextWithArabic(base64WithPrefix);
      }

      let extractedText = response.data.ParsedResults?.[0]?.ParsedText || '';
      
      // If no Arabic detected, try again with Arabic language
      if (!extractedText.match(/[\u0600-\u06FF]/)) {
        this.logger.log('🔄 No Arabic detected, trying Arabic OCR...');
        const arabicText = await this.extractTextWithArabic(base64WithPrefix);
        if (arabicText && arabicText.length > extractedText.length) {
          extractedText = arabicText;
        }
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        this.logger.warn('⚠️ No text detected in the image');
        return '';
      }

      this.logger.log(`✅ OCR completed. Extracted ${extractedText.length} characters`);
      this.logger.log(`📝 French text detected: ${extractedText.includes('République') ? 'Yes ✅' : 'No'}`);
      this.logger.log(`📝 Arabic text detected: ${extractedText.match(/[\u0600-\u06FF]/) ? 'Yes ✅' : 'No'}`);
      this.logger.log(`📝 Preview: ${extractedText.substring(0, 100)}...`);
      
      return extractedText;
    } catch (error) {
      this.logger.error('❌ OCR extraction failed:', error.message);
      throw new BadRequestException(`Failed to extract text from image: ${error.message}`);
    }
  }

  /**
   * Simple base64 image size reducer by sampling
   * Reduces image to fit within OCR.space 1MB limit
   */
  private async compressBase64Image(base64String: string): Promise<string> {
    try {
      // Simple approach: reduce base64 string by sampling
      // This works by keeping every Nth character to reduce size
      const targetSizeKB = 800;
      const currentSizeKB = Math.round((base64String.length * 3) / 4 / 1024);
      
      if (currentSizeKB <= targetSizeKB) {
        return base64String; // Already small enough
      }
      
      // Calculate reduction ratio
      const ratio = targetSizeKB / currentSizeKB;
      
      // For images, we can't just sample characters
      // Instead, return error to force frontend compression
      this.logger.error(`❌ Image too large (${currentSizeKB} KB). Please compress on client side before uploading.`);
      throw new BadRequestException(
        `Image too large (${currentSizeKB} KB). Please compress to under ${targetSizeKB} KB before uploading. ` +
        `You can reduce image quality or dimensions in your app before sending.`
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn('⚠️ Compression check failed');
      return base64String;
    }
  }

  /**
   * Helper method: Extract text with Arabic language setting
   */
  private async extractTextWithArabic(base64WithPrefix: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.ocr.space/parse/image',
        {
          apikey: this.ocrApiKey,
          base64Image: base64WithPrefix,
          language: 'ara', // Arabic language
          isOverlayRequired: false,
          detectOrientation: true,
          scale: true,
          OCREngine: 2,
          isTable: false,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      if (response.data.IsErroredOnProcessing) {
        return '';
      }

      return response.data.ParsedResults?.[0]?.ParsedText || '';
    } catch (error) {
      this.logger.warn('⚠️ Arabic OCR attempt failed:', error.message);
      return '';
    }
  }

  /**
   * Check if the extracted text contains Tunisian restaurant permit keywords
   */
  private checkTunisianKeywords(text: string): { found: boolean; keywords: string[] } {
    const normalizedText = text.toLowerCase();
    const foundKeywords: string[] = [];

    for (const keyword of this.TUNISIAN_KEYWORDS) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    // Additional check for restaurant-specific terms
    const hasRestaurantTerm = 
      normalizedText.includes('restaurant') ||
      normalizedText.includes('مطعم') ||
      normalizedText.includes('établissement') ||
      normalizedText.includes('etablissement');

    const hasAuthorizationTerm = 
      normalizedText.includes('autorisation') ||
      normalizedText.includes('ترخيص') ||
      normalizedText.includes('exploitation');

    return {
      found: foundKeywords.length > 0 && (hasRestaurantTerm || hasAuthorizationTerm),
      keywords: foundKeywords,
    };
  }

  /**
   * Extract permit number from text using regex patterns
   */
  private extractLicenseNumber(text: string): string | null {
    // Remove extra whitespace and normalize
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // Try each pattern
    for (const pattern of this.LICENSE_NUMBER_PATTERNS) {
      const matches = normalizedText.match(pattern);
      
      if (matches && matches.length > 0) {
        // Return the first valid match
        // Prioritize longer numbers (more likely to be permit numbers)
        const sortedMatches = matches.sort((a, b) => b.length - a.length);
        
        for (const match of sortedMatches) {
          // Clean the match (remove N°, no, etc.)
          let cleaned = match.replace(/(?:N°|n°|no|NO)[:\s]*/gi, '').trim();
          cleaned = cleaned.replace(/[\/\-\s]/g, '');
          
          // Permit numbers should have at least 4 characters
          if (cleaned.length >= 4) {
            this.logger.log(`✅ Extracted permit number: ${match}`);
            return match; // Return original format with formatting
          }
        }
      }
    }

    this.logger.warn('⚠️ No valid permit number found in text');
    return null;
  }

  /**
   * Check if license number already exists in database
   */
  async checkDuplicateLicense(licenseNumber: string): Promise<boolean> {
    try {
      const existing = await this.profModel.findOne({ 
        licenseNumber: { $regex: new RegExp(`^${licenseNumber}$`, 'i') } 
      }).exec();

      if (existing) {
        this.logger.warn(`⚠️ Duplicate license found: ${licenseNumber}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('❌ Error checking duplicate license:', error.message);
      throw error;
    }
  }

  /**
   * Main validation method - validates Tunisian restaurant operation permit
   */
  async validateTunisianLicense(imageBuffer: Buffer): Promise<LicenseValidationResult> {
    try {
      this.logger.log('🚀 Starting Tunisian restaurant permit validation...');

      // Step 1: Extract text using OCR
      const extractedText = await this.extractTextFromImage(imageBuffer);

      if (!extractedText || extractedText.length < 20) {
        return {
          isValid: false,
          licenseNumber: null,
          reason: 'Image quality too low or no readable text found. Please upload a clearer photo.',
          extractedText,
          confidence: 'low',
          tunisianKeywordsFound: [],
        };
      }

      // Step 2: Check for Tunisian-specific keywords
      const { found: hasKeywords, keywords: foundKeywords } = this.checkTunisianKeywords(extractedText);

      if (!hasKeywords) {
        this.logger.warn('⚠️ No Tunisian restaurant permit keywords found');
        return {
          isValid: false,
          licenseNumber: null,
          reason: 'This does not appear to be a Tunisian restaurant operation permit (Autorisation d\'exploitation d\'un restaurant). Please upload a valid permit.',
          extractedText,
          confidence: 'low',
          tunisianKeywordsFound: [],
        };
      }

      // Step 3: Extract permit number
      const licenseNumber = this.extractLicenseNumber(extractedText);

      if (!licenseNumber) {
        return {
          isValid: false,
          licenseNumber: null,
          reason: 'Could not extract permit number from the image. Please ensure the authorization number is clearly visible.',
          extractedText,
          confidence: 'medium',
          tunisianKeywordsFound: foundKeywords,
        };
      }

      // Step 4: Check for duplicates
      const isDuplicate = await this.checkDuplicateLicense(licenseNumber);

      if (isDuplicate) {
        return {
          isValid: false,
          licenseNumber,
          reason: 'This restaurant permit is already registered in our system. Each permit can only be used once.',
          extractedText,
          confidence: 'high',
          tunisianKeywordsFound: foundKeywords,
        };
      }

      // Step 5: Determine confidence level
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      
      if (foundKeywords.length >= 3 && licenseNumber.length >= 4) {
        confidence = 'high';
      } else if (foundKeywords.length >= 2) {
        confidence = 'medium';
      }

      this.logger.log('✅ Restaurant permit validation successful!');
      
      return {
        isValid: true,
        licenseNumber,
        reason: 'Restaurant operation permit validated successfully',
        extractedText,
        confidence,
        tunisianKeywordsFound: foundKeywords,
      };
    } catch (error) {
      this.logger.error('❌ License validation error:', error.message);
      throw new BadRequestException(`License validation failed: ${error.message}`);
    }
  }

  /**
   * Validate license from base64 string
   */
  async validateLicenseFromBase64(base64String: string): Promise<LicenseValidationResult> {
    try {
      // Remove data URI prefix if present
      const base64Data = base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;

      // Convert to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      return this.validateTunisianLicense(buffer);
    } catch (error) {
      this.logger.error('❌ Base64 validation error:', error.message);
      throw new BadRequestException(`Invalid image format: ${error.message}`);
    }
  }

  /**
   * Validate license from file upload
   */
  async validateLicenseFromFile(file: Express.Multer.File): Promise<LicenseValidationResult> {
    try {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('File too large. Maximum size is 10MB.');
      }

      return this.validateTunisianLicense(file.buffer);
    } catch (error) {
      this.logger.error('❌ File validation error:', error.message);
      throw error;
    }
  }
}

