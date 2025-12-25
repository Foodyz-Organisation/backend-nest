# Tunisian Driver's License Validation System - Setup Guide

## 🎯 Overview

This system validates Tunisian driver's licenses during professional account signup using:
- **Google Cloud Vision API** for OCR text extraction
- **Pattern matching** to verify Tunisian license authenticity
- **Duplicate detection** to prevent multiple accounts with the same license
- **Supabase Storage** for secure license image storage

---

## 📋 Prerequisites

1. **Google Cloud Account** with Cloud Vision API enabled
2. **Supabase Account** with storage bucket configured
3. **Node.js** and **NestJS** environment set up

---

## 🔧 Setup Instructions

### Step 1: Google Cloud Vision Setup

#### Option A: Using Service Account JSON (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name it (e.g., "license-ocr-service")
   - Grant role: "Cloud Vision AI Service Agent"
   - Click "Done"
5. Create a key:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file

#### Option B: Using JSON credentials as environment variable

6. Copy the entire JSON content and add it to your `.env` file as a single-line string:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
```

#### Option C: Using credentials file path

7. Place the downloaded JSON file in your project (e.g., `config/google-credentials.json`)
8. Add to `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json
```

⚠️ **Important**: Add `config/` to `.gitignore` to avoid committing credentials!

---

### Step 2: Supabase Storage Setup

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Storage** section
3. Create a bucket named `uploads` (or use your existing bucket)
4. Create a folder named `licenses` inside the bucket
5. Set bucket permissions:
   - Make it **public** if you want license images to be publicly accessible
   - Or keep it **private** and use signed URLs

6. Add Supabase credentials to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_MEDIA_BUCKET_NAME=uploads
```

---

### Step 3: Environment Variables

Add all required variables to your `.env` file:

```env
# Google Cloud Vision
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_MEDIA_BUCKET_NAME=uploads

# Existing variables (JWT, Database, etc.)
JWT_SECRET=your-jwt-secret
MONGO_URI=your-mongodb-uri
# ... other existing variables
```

---

### Step 4: Install Dependencies

All required dependencies are already in `package.json`. If needed, install them:

```bash
npm install
```

Key dependencies:
- `@google-cloud/vision` - OCR text extraction
- `@supabase/supabase-js` - Cloud storage
- `@nestjs/mongoose` - Database operations

---

### Step 5: Start the Server

```bash
npm run start:dev
```

You should see these logs:
```
✅ Google Cloud Vision initialized with JSON credentials
✅ Supabase Storage service initialized
```

If you see errors, check your environment variables.

---

## 🧪 Testing the API

### Test 1: Validate License (Without Signup)

This endpoint tests OCR functionality without creating an account.

**Endpoint**: `POST /professionals/validate-license`

**Request Body**:
```json
{
  "licenseImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Expected Success Response** (200):
```json
{
  "isValid": true,
  "licenseNumber": "12345678",
  "reason": "License validated successfully",
  "extractedText": "REPUBLIQUE TUNISIENNE\nPERMIS DE CONDUIRE...",
  "confidence": "high",
  "tunisianKeywordsFound": [
    "republique tunisienne",
    "permis de conduire",
    "tunisie"
  ]
}
```

**Expected Failure Response** (400):
```json
{
  "isValid": false,
  "licenseNumber": null,
  "reason": "This does not appear to be a Tunisian driver's license...",
  "extractedText": "...",
  "confidence": "low",
  "tunisianKeywordsFound": []
}
```

---

### Test 2: Professional Signup with License

**Endpoint**: `POST /auth/signup/professional`

**Request Body**:
```json
{
  "email": "professional@example.com",
  "password": "SecurePassword123!",
  "fullName": "Ahmed Ben Ali",
  "licenseImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "locations": [
    {
      "name": "Main Branch",
      "address": "Avenue Habib Bourguiba, Tunis",
      "lat": 36.8065,
      "lon": 10.1815
    }
  ]
}
```

**Expected Success Response** (201):
```json
{
  "message": "Professional account registered successfully",
  "licenseNumber": "12345678",
  "confidence": "high",
  "professionalId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Expected Failure Responses**:

1. **Invalid License** (400):
```json
{
  "message": "License validation failed",
  "reason": "This does not appear to be a Tunisian driver's license...",
  "details": {
    "extractedText": "...",
    "tunisianKeywordsFound": []
  }
}
```

2. **Duplicate License** (400):
```json
{
  "message": "License validation failed",
  "reason": "This license number is already registered in our system.",
  "details": { ... }
}
```

3. **Poor Image Quality** (400):
```json
{
  "message": "License validation failed",
  "reason": "Image quality too low or no readable text found. Please upload a clearer photo.",
  "details": { ... }
}
```

---

### Test 3: File Upload (Alternative Method)

**Endpoint**: `POST /professionals/validate-license-file`

**Request Type**: `multipart/form-data`

**Form Data**:
- `file`: (select license image file - JPG, PNG, WebP)

**Response**: Same as Test 1

---

## 🔍 How the Validation Works

### Step-by-Step Process:

1. **Image Upload**: User uploads license photo (base64 or file)
   
2. **OCR Extraction**: Google Cloud Vision extracts all text from the image
   ```
   Example extracted text:
   "REPUBLIQUE TUNISIENNE
    MINISTERE DU TRANSPORT
    PERMIS DE CONDUIRE
    N° 12345678
    NOM: BEN ALI
    PRENOM: AHMED
    ..."
   ```

3. **Tunisian Keyword Check**: System looks for Tunisian-specific keywords:
   - "tunisie", "tunisia"
   - "république tunisienne"
   - "permis de conduire"
   - "ministère du transport"
   - Arabic equivalents: "وزارة النقل", "رخصة قيادة"

4. **License Number Extraction**: Uses regex patterns to find license numbers:
   - 7-8 digit numbers: `12345678`
   - Letter-number combinations: `AB123456`
   - Formatted numbers: `12-345-678`

5. **Duplicate Check**: Queries MongoDB to ensure license isn't already registered

6. **Confidence Score**:
   - **High**: 3+ keywords found + valid license number (7+ digits)
   - **Medium**: 2+ keywords found
   - **Low**: < 2 keywords found

7. **Image Storage**: If valid, uploads to Supabase `licenses/` folder

8. **Account Creation**: Creates professional account with validation metadata

---

## 📊 Database Schema

The professional account schema includes:

```typescript
{
  licenseNumber: "12345678",
  licenseImageUrl: "https://supabase.co/.../licenses/...",
  licenseValidation: {
    isValidated: true,
    validatedAt: "2025-01-15T10:30:00.000Z",
    confidence: "high",
    extractedText: "REPUBLIQUE TUNISIENNE...",
    tunisianKeywordsFound: ["tunisie", "permis de conduire"],
    rejectionReason: null  // Only set if validation failed
  }
}
```

---

## 🛠️ Testing with Postman/Thunder Client

### Test with Base64 String

1. Take a photo of a Tunisian license
2. Convert to base64:
   - Online: Use [base64-image.de](https://www.base64-image.de/)
   - CLI: `base64 -i license.jpg -o license.txt`
3. Copy the base64 string (with or without `data:image/jpeg;base64,` prefix)
4. Send POST request to `/professionals/validate-license`

### Test with File Upload

1. Use Thunder Client or Postman
2. Select POST method
3. URL: `http://localhost:3000/professionals/validate-license-file`
4. Body type: `form-data`
5. Add field: `file` (type: File)
6. Select license image
7. Send request

---

## 🐛 Troubleshooting

### Issue: "Google Cloud Vision is not configured"

**Solution**: Check `.env` file contains either:
- `GOOGLE_SERVICE_ACCOUNT_JSON` with valid JSON
- `GOOGLE_APPLICATION_CREDENTIALS` with valid file path

### Issue: "Failed to upload file to Supabase"

**Solution**: 
1. Verify Supabase credentials in `.env`
2. Check bucket exists and is named correctly
3. Ensure `licenses/` folder exists in bucket
4. Verify bucket permissions allow uploads

### Issue: "No Tunisian keywords found"

**Possible causes**:
1. License is not Tunisian
2. Image quality is too low
3. Text is not clearly visible
4. License is in a language not supported

**Solution**: 
- Use high-resolution images
- Ensure good lighting
- Make sure all text is visible and not blurred

### Issue: "Could not extract license number"

**Solution**:
- Ensure license number is clearly visible
- Check if license number format matches patterns
- May need to add custom regex patterns for specific formats

---

## 🎨 Frontend Integration (Next Steps)

See `FRONTEND_INTEGRATION_GUIDE.md` for React Native/Android implementation.

---

## 📝 Notes

- **Security**: License images contain sensitive personal data. Ensure:
  - Supabase bucket has proper access controls
  - HTTPS is enabled in production
  - Images are only accessible to authorized users

- **Performance**: 
  - OCR takes 2-5 seconds on average
  - Consider showing loading indicator to users
  - Image size limit: 10MB

- **Cost**: 
  - Google Cloud Vision: ~$1.50 per 1,000 images
  - Supabase: Free tier includes 1GB storage + 2GB bandwidth

- **Accuracy**: 
  - Works best with clear, well-lit photos
  - Support for both French and Arabic text
  - May require manual review for edge cases

---

## 🔐 Production Checklist

- [ ] Google Cloud Vision API key is secured
- [ ] Supabase bucket permissions are properly configured
- [ ] Environment variables are set in production
- [ ] HTTPS is enabled
- [ ] Error handling and logging are in place
- [ ] Rate limiting is configured (prevent abuse)
- [ ] Image compression is implemented (reduce costs)
- [ ] Backup OCR service (fallback if Google is down)
- [ ] Manual review process for low-confidence validations
- [ ] GDPR compliance for storing license images

---

## 📞 Support

For issues or questions:
1. Check server logs: `npm run start:dev`
2. Test with sample images first
3. Verify all environment variables are set
4. Check Google Cloud Vision API quota

---

**Status**: ✅ Backend Implementation Complete
**Next**: Frontend Integration (Android App)


