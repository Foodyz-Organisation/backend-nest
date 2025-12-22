# Android Quick Start - Production Backend Integration

## Quick Configuration

### 2. Supabase Configuration
```kotlin
const val SUPABASE_URL = "https://bhfpudsrynnsxzazmcjd.supabase.co"
const val SUPABASE_ANON_KEY = "YOUR_KEY_HERE" // Get from Supabase Dashboard
const val BUCKET_NAME = "uploads"
```

### 3. Key Changes Required

2. **Add Supabase SDK** to `build.gradle`
3. **Update file uploads** to use Supabase Storage
4. **Update image loading** to use Supabase URLs
5. **Add `thumbnailUrl` field** to Post model for video posts

### 4. Dependencies to Add

```kotlin
// In app/build.gradle.kts
dependencies {
    // Supabase
    implementation("io.github.jan-tennert.supabase:storage-kt:2.3.0")
    implementation("io.github.jan-tennert.supabase:gotrue-kt:2.3.0")
    
    // HTTP Client
    implementation("io.ktor:ktor-client-android:2.3.5")
    implementation("io.ktor:ktor-client-core:2.3.5")
    implementation("io.ktor:ktor-client-cio:2.3.5")
    
    // Image Loading
    implementation("com.github.bumptech.glide:glide:4.16.0")
}
```

### 5. File Upload Flow

**Old Flow (Local Storage)**:
```
File → Local Storage → Return local path
```

**New Flow (Supabase)**:
```
File → Supabase Storage → Return public URL → Backend API
```

### 6. Video Post Flow

1. Upload video to Supabase → Get video URL
2. Backend generates thumbnail automatically
3. Backend returns: `{ mediaUrls: [videoUrl], thumbnailUrl: "..." }`
4. Use `thumbnailUrl` in profile, `mediaUrls[0]` for playback

### 7. Testing Endpoints

- **Swagger UI**: https://backend-nest-08qw.onrender.com/api
- **Health Check**: https://backend-nest-08qw.onrender.com
- **Posts API**: https://backend-nest-08qw.onrender.com/api/posts

---

## Priority Tasks

1. ✅ Update API base URL
2. ✅ Add Supabase dependencies
3. ✅ Implement Supabase upload helper
4. ✅ Update file upload logic
5. ✅ Test image upload
6. ✅ Test video upload
7. ✅ Update Post model with `thumbnailUrl`
8. ✅ Implement video autoplay in feed
9. ✅ Test on physical device

---

For detailed implementation, see `ANDROID_INTEGRATION_GUIDE.md`

