# Quick Start Testing Guide

## 🚀 Start the Backend

```bash
npm run start:dev
```

Wait for:
```
✅ Google Cloud Vision initialized
✅ Supabase Storage service initialized
✅ Nest application successfully started
```

---

## 🧪 Test 1: Validate the Setup

### Check if endpoints are available:

```bash
curl http://localhost:3000/professionals
```

Should return `[]` (empty array) if no professionals exist yet.

---

## 🧪 Test 2: Validate a License (Without Signup)

### Method 1: Using curl

1. Convert a Tunisian license image to base64:

```bash
# macOS/Linux
base64 -i your-license.jpg | pbcopy

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-license.jpg")) | Set-Clipboard
```

2. Test the validation endpoint:

```bash
curl -X POST http://localhost:3000/professionals/validate-license \
  -H "Content-Type: application/json" \
  -d '{
    "licenseImage": "data:image/jpeg;base64,YOUR_BASE64_HERE"
  }'
```

### Method 2: Using Postman/Thunder Client

1. Create a POST request to:
   ```
   http://localhost:3000/professionals/validate-license
   ```

2. Body (JSON):
   ```json
   {
     "licenseImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
   }
   ```

3. Send and check response

### Expected Success Response:

```json
{
  "isValid": true,
  "licenseNumber": "12345678",
  "reason": "License validated successfully",
  "extractedText": "REPUBLIQUE TUNISIENNE\nMINISTERE DU TRANSPORT...",
  "confidence": "high",
  "tunisianKeywordsFound": [
    "republique tunisienne",
    "permis de conduire",
    "tunisie"
  ]
}
```

### Expected Failure Response (Non-Tunisian):

```json
{
  "isValid": false,
  "licenseNumber": null,
  "reason": "This does not appear to be a Tunisian driver's license. Please upload a valid Tunisian license.",
  "extractedText": "Some other text...",
  "confidence": "low",
  "tunisianKeywordsFound": []
}
```

---

## 🧪 Test 3: Complete Professional Signup

```bash
curl -X POST http://localhost:3000/auth/signup/professional \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@example.com",
    "password": "SecurePass123!",
    "fullName": "Ahmed Ben Ali",
    "licenseImage": "data:image/jpeg;base64,YOUR_BASE64_HERE",
    "locations": [{
      "name": "Main Branch",
      "address": "Avenue Habib Bourguiba, Tunis",
      "lat": 36.8065,
      "lon": 10.1815
    }]
  }'
```

### Expected Success Response:

```json
{
  "message": "Professional account registered successfully",
  "licenseNumber": "12345678",
  "confidence": "high",
  "professionalId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

---

## 🧪 Test 4: Verify Data in Database

### Using MongoDB Compass:

1. Connect to your MongoDB
2. Navigate to your database
3. Open `professionalaccounts` collection
4. Find the newly created professional
5. Check these fields:
   - `licenseNumber`: Should have extracted number
   - `licenseImageUrl`: Should have Supabase URL
   - `licenseValidation.isValidated`: Should be `true`
   - `licenseValidation.confidence`: Should be `high`, `medium`, or `low`
   - `licenseValidation.tunisianKeywordsFound`: Should have array of keywords

Example document:
```json
{
  "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
  "email": "ahmed@example.com",
  "fullName": "Ahmed Ben Ali",
  "licenseNumber": "12345678",
  "licenseImageUrl": "https://supabase.co/.../licenses/1234567890-abc.jpg",
  "licenseValidation": {
    "isValidated": true,
    "validatedAt": "2025-01-15T10:30:00.000Z",
    "confidence": "high",
    "extractedText": "REPUBLIQUE TUNISIENNE...",
    "tunisianKeywordsFound": ["tunisie", "permis de conduire"]
  },
  "role": "professional",
  "isActive": true,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

---

## 🧪 Test 5: Verify Image in Supabase

1. Go to Supabase Dashboard
2. Navigate to Storage
3. Open your bucket (default: `uploads`)
4. Check `licenses/` folder
5. You should see the uploaded license image
6. Click to view - should display the license photo

---

## 🧪 Test 6: Test Duplicate Detection

Try to signup again with the SAME license image:

```bash
curl -X POST http://localhost:3000/auth/signup/professional \
  -H "Content-Type: application/json" \
  -d '{
    "email": "different@example.com",
    "password": "SecurePass123!",
    "fullName": "Fatma Ben Hassan",
    "licenseImage": "data:image/jpeg;base64,SAME_BASE64_AS_BEFORE"
  }'
```

### Expected Response (400 Bad Request):

```json
{
  "statusCode": 400,
  "message": "License validation failed",
  "reason": "This license number is already registered in our system.",
  "details": {
    "extractedText": "...",
    "tunisianKeywordsFound": [...]
  }
}
```

---

## 🧪 Test 7: Test with Invalid Images

### Test A: Non-license document

Upload a regular photo or random document - should fail with:
```
"This does not appear to be a Tunisian driver's license"
```

### Test B: Blurry/low quality image

Upload a blurry photo - should fail with:
```
"Image quality too low or no readable text found"
```

### Test C: Foreign license

Upload a non-Tunisian license - should fail with:
```
"This does not appear to be a Tunisian driver's license"
```

---

## 🧪 Test 8: Check Server Logs

Watch the console output during signup. You should see:

```
🚀 Starting professional signup with license validation...
📸 Validating Tunisian driver's license...
🔍 Performing OCR on license image...
✅ OCR completed. Extracted 234 characters
✅ Extracted license number: 12345678
✅ License validated successfully!
📋 License Number: 12345678
🎯 Confidence: high
☁️ Uploading license image to Supabase...
✅ License image uploaded: https://supabase.co/.../licenses/...
✅ Professional account created successfully: ahmed@example.com
📋 License Number: 12345678
```

---

## 🧪 Test 9: Login and Get Professional Data

### Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Professional by ID:

```bash
curl http://localhost:3000/professionals/PROFESSIONAL_ID_HERE
```

Should return full professional data including license validation info.

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Google Cloud Vision initialized
- [ ] Supabase Storage initialized
- [ ] Validation endpoint works (`/professionals/validate-license`)
- [ ] Signup endpoint works (`/auth/signup/professional`)
- [ ] License image uploaded to Supabase
- [ ] License number extracted correctly
- [ ] Duplicate detection works
- [ ] Invalid licenses are rejected
- [ ] Professional can login
- [ ] Data stored correctly in MongoDB

---

## ❌ Troubleshooting

### Issue: "Google Cloud Vision is not configured"

**Fix**: Add to `.env`:
```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### Issue: "Failed to upload file to Supabase"

**Fix**: Check `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-key
SUPABASE_MEDIA_BUCKET_NAME=uploads
```

### Issue: "No text detected in the image"

**Possible causes**:
- Image is blank or corrupted
- Base64 encoding is wrong
- Image quality is too low

**Fix**: 
- Use a clear, high-quality image
- Verify base64 encoding
- Test with a different image

### Issue: "No Tunisian keywords found"

**Possible causes**:
- Not a Tunisian license
- Text is not readable
- OCR failed

**Fix**:
- Ensure you're using an actual Tunisian driver's license
- Check image quality and lighting
- Look at `extractedText` in response to see what OCR detected

---

## 🎯 Quick Test Commands (All in One)

```bash
# 1. Start server
npm run start:dev

# 2. In another terminal, test validation
curl -X POST http://localhost:3000/professionals/validate-license \
  -H "Content-Type: application/json" \
  -d '{"licenseImage":"data:image/jpeg;base64,YOUR_BASE64"}'

# 3. Test signup
curl -X POST http://localhost:3000/auth/signup/professional \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!",
    "fullName":"Test User",
    "licenseImage":"data:image/jpeg;base64,YOUR_BASE64"
  }'

# 4. Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 📝 Next Steps After Testing

1. ✅ Backend is working
2. ✅ Move to frontend integration (see `FRONTEND_INTEGRATION_GUIDE.md`)
3. ✅ Test with real Android app
4. ✅ Deploy to production

---

**Happy Testing! 🎉**


