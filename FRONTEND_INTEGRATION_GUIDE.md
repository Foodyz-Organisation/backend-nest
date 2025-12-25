# Frontend Integration Guide - Tunisian License Validation

## 🎯 Overview

This guide explains how to integrate the Tunisian license validation system into your **React Native Android app**.

---

## 📱 User Flow

```
1. User opens "Create Professional Account" screen
2. Fills in basic info (email, password, name, location)
3. Clicks "Upload License Photo"
4. Camera opens OR file picker opens
5. User takes photo / selects existing photo
6. App shows preview of captured image
7. User clicks "Continue"
8. App converts image to base64
9. App sends signup request with all data + base64 image
10. Backend validates license (2-5 seconds)
11. Success: Account created ✅
    OR
    Failure: Error message shown with specific reason ❌
```

---

## 🛠️ Implementation Steps

### Step 1: Install Required Packages

```bash
npm install react-native-image-picker
npm install react-native-image-base64
# OR if using Expo
expo install expo-image-picker
```

### Step 2: Request Permissions (Android)

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 📸 Image Capture Component (React Native)

### Option A: Using `react-native-image-picker`

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImgToBase64 from 'react-native-image-base64';

interface LicenseImagePickerProps {
  onImageSelected: (base64: string) => void;
}

export const LicenseImagePicker: React.FC<LicenseImagePickerProps> = ({ onImageSelected }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleImagePicker = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to capture image');
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Error', 'No image selected');
      return;
    }

    setImageUri(asset.uri);
    convertToBase64(asset.uri);
  };

  const convertToBase64 = async (uri: string) => {
    try {
      setIsConverting(true);
      
      // Remove file:// prefix if present
      const path = uri.replace('file://', '');
      
      // Convert to base64
      const base64 = await ImgToBase64.getBase64String(path);
      
      // Add data URI prefix
      const base64WithPrefix = `data:image/jpeg;base64,${base64}`;
      
      onImageSelected(base64WithPrefix);
      setIsConverting(false);
    } catch (error) {
      console.error('Base64 conversion error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      setIsConverting(false);
    }
  };

  const openCamera = () => {
    launchCamera({
      mediaType: 'photo',
      quality: 0.8, // Good balance between quality and file size
      maxWidth: 1920,
      maxHeight: 1920,
      includeBase64: false, // We'll convert separately for better control
    }, handleImagePicker);
  };

  const openGallery = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      includeBase64: false,
    }, handleImagePicker);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Upload License Photo *</Text>
      <Text style={styles.hint}>
        Take a clear photo of your Tunisian driver's license. Ensure all text is visible.
      </Text>

      {imageUri && (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          {isConverting && (
            <View style={styles.convertingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.convertingText}>Processing image...</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={openCamera}>
          <Text style={styles.buttonText}>📷 Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={openGallery}>
          <Text style={styles.buttonText}>🖼️ Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  convertingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convertingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

### Option B: Using Expo (Simpler)

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export const LicenseImagePickerExpo: React.FC<{ onImageSelected: (base64: string) => void }> = ({ onImageSelected }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const convertToBase64 = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const base64WithPrefix = `data:image/jpeg;base64,${base64}`;
      onImageSelected(base64WithPrefix);
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      convertToBase64(uri);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      convertToBase64(uri);
    }
  };

  return (
    <View>
      {/* Similar UI as Option A */}
      <TouchableOpacity onPress={openCamera}>
        <Text>Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={openGallery}>
        <Text>Choose from Gallery</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 200, height: 200 }} />}
    </View>
  );
};
```

---

## 📤 API Integration

### Professional Signup with License Validation

```typescript
import axios from 'axios';

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  licenseImage: string; // Base64 string
  locations?: {
    name?: string;
    address?: string;
    lat: number;
    lon: number;
  }[];
}

interface SignupResponse {
  message: string;
  licenseNumber: string;
  confidence: 'high' | 'medium' | 'low';
  professionalId: string;
}

interface ErrorResponse {
  message: string;
  reason: string;
  details?: {
    extractedText: string;
    tunisianKeywordsFound: string[];
  };
}

const API_BASE_URL = 'https://your-backend.com'; // Replace with your backend URL

export const signupProfessional = async (data: SignupData): Promise<SignupResponse> => {
  try {
    const response = await axios.post<SignupResponse>(
      `${API_BASE_URL}/auth/signup/professional`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds (OCR can take time)
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const errorData: ErrorResponse = error.response.data;
      throw new Error(errorData.reason || errorData.message);
    }
    throw new Error('Network error. Please check your connection.');
  }
};

// Test validation without signup
export const validateLicense = async (licenseImage: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/professionals/validate-license`,
      { licenseImage },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.reason || 'Validation failed');
  }
};
```

---

## 🎨 Complete Signup Screen Example

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LicenseImagePicker } from './LicenseImagePicker';
import { signupProfessional } from './api';

export const ProfessionalSignupScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    // Validation
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!licenseImage) {
      Alert.alert('Error', 'Please upload your driver\'s license photo');
      return;
    }

    try {
      setIsLoading(true);

      const result = await signupProfessional({
        email,
        password,
        fullName,
        licenseImage,
        locations: [
          {
            name: 'Main Branch',
            address: 'Tunis, Tunisia',
            lat: 36.8065,
            lon: 10.1815,
          },
        ],
      });

      Alert.alert(
        'Success! ✅',
        `Account created successfully!\nLicense: ${result.licenseNumber}\nConfidence: ${result.confidence}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to login or dashboard
              console.log('Professional ID:', result.professionalId);
            },
          },
        ]
      );
    } catch (error: any) {
      // Show specific error message from backend
      Alert.alert(
        'Validation Failed ❌',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Professional Account</Text>
      <Text style={styles.subtitle}>
        For restaurant owners, food truck operators, and catering services
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <LicenseImagePicker onImageSelected={setLicenseImage} />

      {licenseImage && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ License photo uploaded</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
        onPress={handleSignup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signupButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>
            Validating your license... This may take a few seconds
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        By creating an account, you agree that your driver's license will be validated
        to ensure you are authorized to operate a food business in Tunisia.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  successBanner: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  signupButtonDisabled: {
    backgroundColor: '#ccc',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});
```

---

## ⚠️ Error Handling Examples

### Common Error Messages and User-Friendly Responses

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'This does not appear to be a Tunisian driver\'s license': 
    '🇹🇳 Please upload a valid Tunisian driver\'s license. Other documents are not accepted.',
  
  'Image quality too low or no readable text found': 
    '📸 Photo quality is too low. Please retake with better lighting and ensure all text is visible.',
  
  'Could not extract license number': 
    '🔍 Could not read the license number. Please ensure it\'s clearly visible and not blurred.',
  
  'This license number is already registered': 
    '⚠️ This license is already registered. Each license can only be used once. If this is an error, please contact support.',
  
  'Failed to upload file to Supabase': 
    '☁️ Upload failed. Please check your internet connection and try again.',
  
  'Network error': 
    '📡 Network error. Please check your internet connection.',
};

export const getErrorMessage = (errorMessage: string): string => {
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  return errorMessage || 'An unexpected error occurred. Please try again.';
};

// Usage in signup
catch (error: any) {
  const friendlyMessage = getErrorMessage(error.message);
  Alert.alert('Validation Failed', friendlyMessage);
}
```

---

## 🧪 Testing Tips

### Test with Sample Images

1. **Valid Tunisian License**: Should succeed
2. **Non-Tunisian License**: Should fail with "not Tunisian" message
3. **Blurry Photo**: Should fail with "image quality" message
4. **Random Document**: Should fail with "not a license" message
5. **Duplicate License**: Should fail with "already registered" message

### Mock API for Development

```typescript
// For testing UI without hitting real API
export const mockSignupProfessional = async (data: SignupData): Promise<SignupResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate success
      resolve({
        message: 'Professional account registered successfully',
        licenseNumber: '12345678',
        confidence: 'high',
        professionalId: 'mock-id-123',
      });

      // OR simulate failure
      // reject({ message: 'License validation failed', reason: 'Image quality too low' });
    }, 3000); // Simulate 3-second OCR processing
  });
};
```

---

## ✅ Best Practices

1. **Image Quality**:
   - Set quality to 0.7-0.8 (balance between quality and file size)
   - Max dimensions: 1920x1920px
   - Format: JPEG (best compression)

2. **User Experience**:
   - Show loading indicator during validation (2-5 seconds)
   - Display preview before uploading
   - Allow retaking photo if not satisfied
   - Show specific error messages

3. **Error Handling**:
   - Use 30-second timeout for OCR requests
   - Handle network errors gracefully
   - Provide retry option
   - Show validation progress

4. **Security**:
   - Never store base64 in state longer than needed
   - Use HTTPS for all requests
   - Validate on backend (never trust frontend)

5. **Performance**:
   - Compress images before sending
   - Use AsyncStorage to save form data (but NOT license image)
   - Clear image from memory after successful upload

---

## 🚀 Next Steps

1. ✅ Implement image picker component
2. ✅ Integrate API calls
3. ✅ Add error handling
4. ✅ Test with real Tunisian licenses
5. ✅ Add loading states
6. ✅ Implement retry logic
7. ✅ Test edge cases (bad internet, low quality, etc.)

---

## 📞 Support

If you encounter issues:
- Check backend logs for detailed error messages
- Verify image is converting to base64 correctly
- Test API directly with Postman first
- Ensure backend is running and accessible

---

**Status**: ✅ Frontend Integration Guide Complete
**Backend Status**: ✅ Ready for Integration
**Ready to Test**: Yes!


