# 🍽️ Restaurant Permit Validation - Update Summary

## ✅ What Changed

The validation system has been **updated** to validate **"Autorisation d'exploitation d'un restaurant"** (Tunisian Restaurant Operation Permit) instead of driver's licenses.

---

## 🔄 Key Changes Made

### 1. **Updated Keywords Detection**

**OLD** (Driver's License Keywords):
- "permis de conduire"
- "ministère du transport"
- "رخصة قيادة" (Driver's License in Arabic)

**NEW** (Restaurant Permit Keywords):
- "autorisation d'exploitation"
- "restaurant"
- "établissement"
- "ministère du commerce" / "ministère du tourisme"
- "ترخيص" (Authorization in Arabic)
- "مطعم" (Restaurant in Arabic)
- "استغلال" (Operation/Exploitation in Arabic)
- "وزارة التجارة" / "وزارة السياحة" (Ministry of Commerce/Tourism in Arabic)

### 2. **Updated Permit Number Patterns**

**NEW Patterns** (Restaurant Permits):
```typescript
N° 12345          // N° prefix format
123/2023          // Number/Year format
A12345            // Letter + numbers
12345678          // Plain numbers (7-8 digits)
```

### 3. **Updated Validation Logic**

Now checks for:
- ✅ "restaurant" OR "مطعم" (restaurant in Arabic) OR "établissement"
- ✅ "autorisation" OR "ترخيص" OR "exploitation"
- ✅ Tunisian-specific terms

### 4. **Updated Error Messages**

**Before**: 
> "This does not appear to be a Tunisian driver's license..."

**After**: 
> "This does not appear to be a Tunisian restaurant operation permit (Autorisation d'exploitation d'un restaurant)..."

### 5. **Updated Storage Location**

**Before**: Images stored in `licenses/` folder
**After**: Images stored in `restaurant-permits/` folder in Supabase

### 6. **Updated Response Field**

**Before**: Returns `licenseNumber`
**After**: Returns `permitNumber` in signup response

---

## 📱 Frontend Integration (Android)

### The Process Stays the Same:

1. **User Opens Professional Signup**
2. **Fills Basic Information** (email, password, name)
3. **Clicks "Upload Restaurant Permit"** 
4. **Camera/Gallery Opens** (you already have this working)
5. **User Selects Photo** from their phone gallery
6. **Image Converted to Base64** (your existing method)
7. **Sent to Backend** with signup data

### Your Existing Image Upload Method Works!

You mentioned you already have methods for uploading photos from the phone gallery - **those work perfectly** with this system! Just make sure you're sending the base64 string in the `licenseImage` field.

---

## 🧪 API Testing

### Test Endpoint (Without Creating Account)

**Endpoint**: `POST /professionals/validate-restaurant-permit`

**Request Body**:
```json
{
  "licenseImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Success Response**:
```json
{
  "isValid": true,
  "licenseNumber": "N° 12345",
  "reason": "Restaurant operation permit validated successfully",
  "confidence": "high",
  "tunisianKeywordsFound": [
    "republique tunisienne",
    "autorisation",
    "restaurant",
    "exploitation"
  ]
}
```

**Failure Response**:
```json
{
  "isValid": false,
  "licenseNumber": null,
  "reason": "This does not appear to be a Tunisian restaurant operation permit...",
  "confidence": "low",
  "tunisianKeywordsFound": []
}
```

---

## 📋 Professional Signup

**Endpoint**: `POST /auth/signup/professional`

**Request Body**:
```json
{
  "email": "restaurant@example.com",
  "password": "SecurePass123!",
  "fullName": "Restaurant Le Gourmet",
  "licenseImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "locations": [{
    "name": "Main Location",
    "address": "Avenue Habib Bourguiba, Tunis",
    "lat": 36.8065,
    "lon": 10.1815
  }]
}
```

**Success Response**:
```json
{
  "message": "Professional account registered successfully",
  "permitNumber": "N° 12345",
  "confidence": "high",
  "professionalId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

---

## 🗄️ Database Changes

### Professional Account Document:

```typescript
{
  email: "restaurant@example.com",
  fullName: "Restaurant Le Gourmet",
  
  // Restaurant permit info
  licenseNumber: "N° 12345",  // The extracted permit number
  licenseImageUrl: "https://supabase.co/.../restaurant-permits/...",
  
  licenseValidation: {
    isValidated: true,
    validatedAt: "2025-12-25T...",
    confidence: "high",
    extractedText: "REPUBLIQUE TUNISIENNE\nAUTORISATION D'EXPLOITATION...",
    tunisianKeywordsFound: ["autorisation", "restaurant", "exploitation"],
    documentType: "Autorisation d'exploitation d'un restaurant"  // NEW!
  },
  
  // Other fields...
  role: "professional",
  isActive: true,
  locations: [...],
}
```

---

## ✅ What You Need to Do

### 1. **Setup Environment Variables** (Same as before)

```env
# Google Cloud Vision
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_MEDIA_BUCKET_NAME=uploads
```

### 2. **Create `restaurant-permits` Folder in Supabase**

1. Go to Supabase Dashboard → Storage
2. Open your `uploads` bucket
3. Create a new folder: `restaurant-permits`
4. Set permissions as needed

### 3. **Test with Real Restaurant Permit**

Take a photo of a real Tunisian restaurant operation permit and test:

```bash
# Start server
npm run start:dev

# Test validation
curl -X POST http://localhost:3000/professionals/validate-restaurant-permit \
  -H "Content-Type: application/json" \
  -d '{"licenseImage":"data:image/jpeg;base64,YOUR_BASE64_HERE"}'
```

### 4. **Update Your Android App UI** (Optional)

Update text labels:
- "Upload Driver's License" → "Upload Restaurant Permit"
- "License Photo" → "Restaurant Operation Permit"
- etc.

---

## 🎯 Expected Behavior

### ✅ Valid Restaurant Permit:
```
Photo of "Autorisation d'exploitation d'un restaurant"
  ↓
OCR extracts text
  ↓
Detects keywords: "autorisation", "restaurant", "exploitation", "tunisie"
  ↓
Extracts permit number: "N° 12345"
  ↓
Checks for duplicates
  ↓
Uploads to Supabase (restaurant-permits/)
  ↓
Creates professional account
  ↓
✅ SUCCESS
```

### ❌ Invalid Document (e.g., Driver's License):
```
Photo of driver's license
  ↓
OCR extracts text
  ↓
Detects: "permis de conduire", "transport"
  ↓
Missing: "restaurant", "autorisation", "exploitation"
  ↓
❌ REJECTED: "This does not appear to be a restaurant operation permit"
```

---

## 🐛 Troubleshooting

### Issue: "No restaurant permit keywords found"

**Possible Causes**:
- Not a restaurant permit (wrong document)
- Image quality too low
- Text not readable

**Solution**: 
- Ensure it's the correct document (Autorisation d'exploitation)
- Take clear, well-lit photo
- Ensure all text is visible

### Issue: "Could not extract permit number"

**Possible Causes**:
- Permit number not clearly visible
- Unusual format not matching patterns

**Solution**:
- Ensure permit number is visible and not blurred
- Check for format like "N° 12345" or "123/2023"

---

## 📊 What the System Validates

| Check | Description |
|-------|-------------|
| **Document Type** | Must be a restaurant operation permit |
| **Country** | Must be Tunisian (checks for "République Tunisienne") |
| **Keywords** | Must contain restaurant-related terms |
| **Permit Number** | Must have identifiable authorization number |
| **Duplicate** | Permit number not already used |

---

## 🎨 Frontend (Android) - No Changes Needed!

Your existing image capture/upload code works as-is! The field name is still `licenseImage` for backward compatibility.

Just update the user-facing labels:
- UI Label: "Restaurant Permit" instead of "License"
- Help text: "Upload your Autorisation d'exploitation d'un restaurant"

---

## 🚀 Ready to Test!

1. ✅ Backend updated for restaurant permits
2. ✅ Validation logic adjusted
3. ✅ Error messages updated
4. ✅ Database schema supports document type
5. ✅ Supabase folder name changed to `restaurant-permits`

**Next**: Configure environment variables and test with a real restaurant permit! 🍽️

---

## 📞 Need Help?

- **Setup Issues**: See `TUNISIAN_LICENSE_VALIDATION_SETUP.md`
- **Testing Issues**: See `QUICK_START_TESTING.md`
- **Frontend Integration**: See `FRONTEND_INTEGRATION_GUIDE.md`

---

**Updated**: December 25, 2025  
**Status**: ✅ Ready for Testing with Restaurant Permits


