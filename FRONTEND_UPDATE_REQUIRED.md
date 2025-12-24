# Frontend Update Guide - Supabase Storage Migration

## Overview

The backend has been updated to use **Supabase Storage** instead of local file storage. This document outlines what frontend changes are needed.

## ✅ **What Still Works (No Changes Needed)**

1. **File Upload Endpoints** - All upload endpoints work the same way:
   - `POST /posts/uploads` - Still accepts multipart/form-data files
   - `PATCH /users/:id/upload-profile-image` - Still accepts image files
   - `POST /menu-items` (with image) - Still accepts multipart/form-data
   - `POST /reclamation` (with base64 images) - Still accepts base64 strings

2. **API Request Format** - No changes to how you send requests
3. **Authentication** - No changes needed
4. **Response Structure** - Response DTOs remain the same

## ⚠️ **What Changed (Frontend Updates Required)**

### 1. **Image URLs Are Now Full Supabase URLs**

**Before:**
```json
{
  "profilePictureUrl": "/uploads/profile-image.jpg",
  "image": "/uploads/menu-item.jpg",
  "urls": ["http://localhost:3000/uploads/post-image.jpg"]
}
```

**After:**
```json
{
  "profilePictureUrl": "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/profiles/1234567890-abc123.jpg",
  "image": "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/menu-items/1234567890-abc123.jpg",
  "urls": ["https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/posts/1234567890-abc123.jpg"]
}
```

### 2. **Image URLs Can Be Used Directly**

Images are now served directly from Supabase, so you can use the URLs from API responses directly in `<Image>` or `<img>` tags without any URL construction.

### 3. **Removed Endpoint: `/reclamation/image/:filename`**

This endpoint has been removed. Images are now accessible directly via Supabase URLs returned in API responses.

## 🔧 **Required Frontend Changes**

### Change 1: Remove Manual URL Construction

**❌ Don't do this anymore:**
```kotlin
// Android/Kotlin
val imageUrl = "${baseUrl}/uploads/${imagePath}"
val imageUrl = "${baseUrl}${profilePictureUrl}"
```

**✅ Do this instead:**
```kotlin
// Use the URL directly from API response
val imageUrl = post.mediaUrls[0]  // Already a full Supabase URL
val imageUrl = user.profilePictureUrl  // Already a full Supabase URL
```

### Change 2: Image Loading Libraries

Most image loading libraries (Picasso, Glide, Coil, etc.) work with full URLs without changes:

```kotlin
// Android - Glide
Glide.with(context)
    .load(imageUrl)  // Full Supabase URL from API
    .into(imageView)

// Android - Coil
imageView.load(imageUrl)  // Full Supabase URL from API
```

### Change 3: Check for Null/Empty URLs

Some old data might still have relative paths. Handle both cases:

```kotlin
fun getImageUrl(relativePath: String?): String? {
    if (relativePath == null) return null
    
    // If it's already a full URL (starts with http/https), use it directly
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
        return relativePath
    }
    
    // Legacy support: if it's a relative path, construct full URL
    // This is for backward compatibility with old data
    return "${baseUrl}${relativePath}"
}
```

### Change 4: Update Image URL Handling in Models

If your data models have image URL fields, ensure they can handle full URLs:

```kotlin
// User model
data class User(
    val id: String,
    val profilePictureUrl: String? = null,  // Now contains full Supabase URL
    // ...
)

// Post model
data class Post(
    val id: String,
    val mediaUrls: List<String>,  // Now contains full Supabase URLs
    // ...
)

// MenuItem model
data class MenuItem(
    val id: String,
    val image: String? = null,  // Now contains full Supabase URL
    // ...
)
```

## 📱 **Android-Specific Examples**

### Profile Image
```kotlin
// Before
val profileImageUrl = "${apiClient.baseUrl}${user.profilePictureUrl}"
Glide.with(context).load(profileImageUrl).into(profileImageView)

// After
Glide.with(context)
    .load(user.profilePictureUrl)  // Already full URL
    .placeholder(R.drawable.placeholder)
    .error(R.drawable.error_placeholder)
    .into(profileImageView)
```

### Post Images/Media
```kotlin
// Before
post.mediaUrls.forEach { mediaUrl ->
    val fullUrl = "${apiClient.baseUrl}${mediaUrl}"
    // Display image
}

// After
post.mediaUrls.forEach { mediaUrl ->
    // mediaUrl is already a full Supabase URL
    Glide.with(context).load(mediaUrl).into(imageView)
}
```

### Reclamation Images
```kotlin
// Before
val imageUrl = "${apiClient.baseUrl}/reclamation/image/${filename}"
Glide.with(context).load(imageUrl).into(imageView)

// After
// Use the photo URL directly from reclamation.photos array
reclamation.photos.forEach { photoUrl ->
    Glide.with(context).load(photoUrl).into(imageView)  // Full Supabase URL
}
```

## 🍎 **iOS-Specific Examples**

### Profile Image
```swift
// Before
let profileImageURL = URL(string: "\(baseURL)\(user.profilePictureUrl)")
imageView.kf.setImage(with: profileImageURL)

// After
let profileImageURL = URL(string: user.profilePictureUrl)  // Already full URL
imageView.kf.setImage(with: profileImageURL)
```

### Post Images
```swift
// Before
post.mediaUrls.forEach { mediaUrl in
    let fullURL = URL(string: "\(baseURL)\(mediaUrl)")
    // Display image
}

// After
post.mediaUrls.forEach { mediaUrl in
    let imageURL = URL(string: mediaUrl)  // Already full Supabase URL
    imageView.kf.setImage(with: imageURL)
}
```

## 🌐 **Web Frontend Examples**

### React/Next.js
```jsx
// Before
<img src={`${API_BASE_URL}${post.image}`} alt="Post" />

// After
<img src={post.image} alt="Post" />  // post.image is already full URL
```

### Image Component with Fallback
```jsx
function ImageComponent({ src, alt }) {
  // src is already a full Supabase URL from API
  return (
    <img 
      src={src} 
      alt={alt}
      onError={(e) => {
        e.target.src = '/placeholder-image.png';
      }}
    />
  );
}
```

## 🔍 **Testing Checklist**

- [ ] Profile pictures display correctly
- [ ] Post images/videos display correctly
- [ ] Menu item images display correctly
- [ ] Reclamation photos display correctly
- [ ] Images load without URL construction
- [ ] Legacy data (if any) still displays correctly
- [ ] Error handling for broken/missing images works

## 📋 **Migration Steps**

1. **Update Image URL Handling**
   - Remove any URL construction logic for images
   - Use URLs directly from API responses

2. **Update Models/DTOs**
   - Ensure image URL fields accept full URLs
   - Add backward compatibility if needed

3. **Test Image Loading**
   - Test all image types (profiles, posts, menu items, reclamations)
   - Verify images load from Supabase URLs
   - Test error handling for missing images

4. **Update Documentation**
   - Update API documentation if you maintain your own
   - Update team documentation

## 🔄 **Backward Compatibility**

If you have existing data with relative paths in the database, you might need temporary backward compatibility:

```kotlin
fun getSafeImageUrl(imageUrl: String?): String? {
    if (imageUrl == null) return null
    
    // New format: Full Supabase URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl
    }
    
    // Legacy format: Relative path (shouldn't happen with new uploads)
    // Remove this after all old data is migrated
    return "${apiClient.baseUrl}${imageUrl}"
}
```

**Note:** This is only needed if you have old data. New uploads will always return full Supabase URLs.

## ⚡ **Performance Benefits**

Using Supabase Storage URLs directly provides:
- ✅ CDN delivery (faster image loading)
- ✅ Better caching
- ✅ Reduced server load
- ✅ Scalability

## 🆘 **Troubleshooting**

### Images Not Loading

1. **Check URL format**: Ensure the URL is a full Supabase URL starting with `https://`
2. **Check CORS**: Supabase Storage should have CORS configured (handled by backend)
3. **Check bucket permissions**: Ensure the `uploads` bucket is set to Public in Supabase
4. **Check network**: Verify the device has internet connectivity

### Old Images Not Displaying

If you have old data with relative paths:
- Implement backward compatibility handler (see above)
- Or migrate old data to use full URLs
- Or fetch images from the old endpoint (if still available during migration)

## 📞 **Support**

If you encounter issues:
1. Check the API response to see the actual URL format
2. Verify Supabase bucket configuration
3. Check network requests in your app's debugger
4. Review backend logs for upload errors

---

**Summary**: The main change is that image URLs are now full Supabase URLs that can be used directly, eliminating the need for URL construction on the frontend.


