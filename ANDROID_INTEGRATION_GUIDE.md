# Android Studio Integration Guide

## Overview
This guide will help you update your Android project to consume the deployed backend API, integrate Supabase Storage for media uploads, and ensure MongoDB Atlas connectivity.

## Backend Information

- **Backend URL**: `https://backend-nest-08qw.onrender.com/api`
- **Base API URL**: `https://backend-nest-08qw.onrender.com`
- **Swagger Documentation**: `https://backend-nest-08qw.onrender.com/api`

## Prerequisites

1. Android Studio installed
2. Android project open in Android Studio
3. Minimum SDK: API 21 (Android 5.0) or higher
4. Gradle sync completed

---

## Step 1: Update API Configuration

### 1.1 Create/Update API Configuration File

Create or update your API configuration file (e.g., `ApiConfig.kt` or `Constants.kt`):

**Location**: `app/src/main/java/com/yourpackage/config/ApiConfig.kt`

```kotlin
object ApiConfig {
    // Production Backend URL
    const val BASE_URL = "https://backend-nest-08qw.onrender.com"
    const val API_BASE_URL = "$BASE_URL/api"
    
    // API Endpoints
    const val POSTS_ENDPOINT = "$API_BASE_URL/posts"
    const val AUTH_ENDPOINT = "$API_BASE_URL/auth"
    const val USERS_ENDPOINT = "$API_BASE_URL/users"
    const val MENU_ITEMS_ENDPOINT = "$API_BASE_URL/menu-items"
    const val RECLAMATION_ENDPOINT = "$API_BASE_URL/reclamation"
    
    // Upload Endpoints
    const val POSTS_UPLOAD_ENDPOINT = "$POSTS_ENDPOINT/uploads"
    
    // Timeouts
    const val CONNECT_TIMEOUT = 30L // seconds
    const val READ_TIMEOUT = 30L // seconds
    const val WRITE_TIMEOUT = 30L // seconds
}
```

### 1.2 Update Retrofit/HTTP Client Configuration

If using Retrofit, update your service interface:

```kotlin
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var retrofit: Retrofit? = null
    
    fun getClient(): Retrofit {
        if (retrofit == null) {
            val logging = HttpLoggingInterceptor()
            logging.level = HttpLoggingInterceptor.Level.BODY
            
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(ApiConfig.CONNECT_TIMEOUT, TimeUnit.SECONDS)
                .readTimeout(ApiConfig.READ_TIMEOUT, TimeUnit.SECONDS)
                .writeTimeout(ApiConfig.WRITE_TIMEOUT, TimeUnit.SECONDS)
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Accept", "application/json")
                        // Add your JWT token here if needed
                        // .addHeader("Authorization", "Bearer $token")
                        .build()
                    chain.proceed(request)
                }
                .build()
            
            retrofit = Retrofit.Builder()
                .baseUrl(ApiConfig.API_BASE_URL + "/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }
}
```

---

## Step 2: Integrate Supabase Storage

### 2.1 Add Supabase Dependencies

Add to your `app/build.gradle.kts` (or `app/build.gradle`):

```kotlin
dependencies {
    // Supabase Storage
    implementation("io.github.jan-tennert.supabase:storage-kt:2.3.0")
    implementation("io.github.jan-tennert.supabase:gotrue-kt:2.3.0")
    
    // HTTP client (if not already included)
    implementation("io.ktor:ktor-client-android:2.3.5")
    implementation("io.ktor:ktor-client-core:2.3.5")
    implementation("io.ktor:ktor-client-cio:2.3.5")
    
    // Image loading (for displaying images from Supabase)
    implementation("com.github.bumptech.glide:glide:4.16.0")
}
```

**Don't forget to sync Gradle after adding dependencies!**

### 2.2 Configure Supabase Client

Create a Supabase configuration file:

**Location**: `app/src/main/java/com/yourpackage/supabase/SupabaseConfig.kt`

```kotlin
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android

object SupabaseConfig {
    // Supabase Configuration
    const val SUPABASE_URL = "https://bhfpudsrynnsxzazmcjd.supabase.co"
    const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY" // Get from Supabase Dashboard -> Settings -> API
    const val BUCKET_NAME = "uploads"
    
    // Create Supabase Client
    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Storage) {
            httpEngine = HttpClient(Android)
        }
    }
    
    // Storage instance
    val storage = client.storage.from(BUCKET_NAME)
}
```

### 2.3 Create Supabase Storage Helper

**Location**: `app/src/main/java/com/yourpackage/supabase/SupabaseStorageHelper.kt`

```kotlin
import android.graphics.Bitmap
import android.util.Base64
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.*

object SupabaseStorageHelper {
    private val storage = SupabaseConfig.storage
    
    /**
     * Upload an image file to Supabase Storage
     * @param filePath Local file path
     * @param folder Folder name in Supabase (e.g., "posts", "profiles", "reclamations")
     * @return Public URL of the uploaded file
     */
    suspend fun uploadImage(
        filePath: String,
        folder: String = "posts"
    ): String = withContext(Dispatchers.IO) {
        try {
            val file = File(filePath)
            val fileName = "${UUID.randomUUID()}-${file.name}"
            val storagePath = "$folder/$fileName"
            
            // Upload file to Supabase
            storage.upload(storagePath, file)
            
            // Get public URL
            val publicUrl = storage.publicUrl(storagePath)
            publicUrl
        } catch (e: Exception) {
            throw Exception("Failed to upload image to Supabase: ${e.message}", e)
        }
    }
    
    /**
     * Upload a video file to Supabase Storage
     */
    suspend fun uploadVideo(
        filePath: String,
        folder: String = "posts"
    ): String = withContext(Dispatchers.IO) {
        try {
            val file = File(filePath)
            val fileName = "${UUID.randomUUID()}-${file.name}"
            val storagePath = "$folder/$fileName"
            
            storage.upload(storagePath, file)
            
            val publicUrl = storage.publicUrl(storagePath)
            publicUrl
        } catch (e: Exception) {
            throw Exception("Failed to upload video to Supabase: ${e.message}", e)
        }
    }
    
    /**
     * Upload Bitmap as image
     */
    suspend fun uploadBitmap(
        bitmap: Bitmap,
        folder: String = "posts",
        format: Bitmap.CompressFormat = Bitmap.CompressFormat.JPEG,
        quality: Int = 90
    ): String = withContext(Dispatchers.IO) {
        try {
            val fileName = "${UUID.randomUUID()}.${if (format == Bitmap.CompressFormat.JPEG) "jpg" else "png"}"
            val storagePath = "$folder/$fileName"
            
            // Convert bitmap to byte array
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(format, quality, outputStream)
            val byteArray = outputStream.toByteArray()
            
            // Upload to Supabase
            storage.upload(storagePath, byteArray)
            
            val publicUrl = storage.publicUrl(storagePath)
            publicUrl
        } catch (e: Exception) {
            throw Exception("Failed to upload bitmap to Supabase: ${e.message}", e)
        }
    }
    
    /**
     * Delete a file from Supabase Storage
     */
    suspend fun deleteFile(storagePath: String): Boolean = withContext(Dispatchers.IO) {
        try {
            storage.remove(storagePath)
            true
        } catch (e: Exception) {
            false
        }
    }
}
```

---

## Step 3: Update File Upload Logic

### 3.1 Update Post Creation with Supabase Upload

**Example**: `PostRepository.kt` or your upload service

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PostRepository {
    private val apiService = RetrofitClient.getClient().create(PostApiService::class.java)
    
    /**
     * Upload media files (images/videos) to Supabase and create post
     */
    suspend fun createPostWithMedia(
        caption: String,
        foodType: String,
        mediaType: String, // "image", "reel", "carousel"
        mediaFilePaths: List<String>,
        ownerId: String,
        ownerType: String
    ): Result<PostResponse> = withContext(Dispatchers.IO) {
        try {
            // Step 1: Upload files to Supabase
            val uploadedUrls = mutableListOf<String>()
            
            for (filePath in mediaFilePaths) {
                val isVideo = filePath.endsWith(".mp4", ignoreCase = true) ||
                             filePath.endsWith(".mov", ignoreCase = true) ||
                             filePath.endsWith(".avi", ignoreCase = true)
                
                val url = if (isVideo) {
                    // Upload video - backend will generate thumbnail automatically
                    SupabaseStorageHelper.uploadVideo(filePath, "posts")
                } else {
                    // Upload image
                    SupabaseStorageHelper.uploadImage(filePath, "posts")
                }
                
                uploadedUrls.add(url)
                
                // If video, backend returns [videoUrl, thumbnailUrl]
                // Thumbnail is automatically generated and uploaded by backend
            }
            
            // Step 2: Create post with uploaded URLs
            val createPostDto = CreatePostDto(
                caption = caption,
                mediaUrls = uploadedUrls,
                mediaType = mediaType,
                foodType = foodType
            )
            
            // Call backend API to create post
            val response = apiService.createPost(
                ownerId = ownerId,
                ownerType = ownerType,
                createPostDto = createPostDto
            )
            
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### 3.2 Update Profile Picture Upload

```kotlin
suspend fun uploadProfilePicture(
    userId: String,
    imagePath: String
): Result<String> = withContext(Dispatchers.IO) {
    try {
        // Upload to Supabase
        val imageUrl = SupabaseStorageHelper.uploadImage(imagePath, "profiles")
        
        // Update user profile with new image URL
        val response = apiService.updateProfilePicture(userId, imageUrl)
        
        Result.success(imageUrl)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

---

## Step 4: Update Data Models

### 4.1 Update Post Model

Ensure your Post model includes the `thumbnailUrl` field for video posts:

```kotlin
data class Post(
    val _id: String,
    val caption: String,
    val mediaUrls: List<String>,
    val mediaType: String, // "image", "reel", "carousel"
    val foodType: String,
    val thumbnailUrl: String? = null, // For video posts
    val ownerId: String,
    val ownerModel: String,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val createdAt: String,
    // ... other fields
)
```

---

## Step 5: Update Image Loading

### 5.1 Using Glide to Load Images from Supabase

Since images are now on Supabase, you can load them directly using Glide:

```kotlin
import com.bumptech.glide.Glide

// Load image from Supabase URL
fun loadSupabaseImage(imageView: ImageView, imageUrl: String) {
    Glide.with(imageView.context)
        .load(imageUrl)
        .placeholder(R.drawable.placeholder) // Your placeholder drawable
        .error(R.drawable.error_image) // Your error drawable
        .into(imageView)
}

// Example usage in RecyclerView
class PostViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
    fun bind(post: Post) {
        if (post.mediaType == "reel" && !post.thumbnailUrl.isNullOrEmpty()) {
            // For video posts, show thumbnail
            loadSupabaseImage(itemView.imageView, post.thumbnailUrl!!)
        } else if (post.mediaUrls.isNotEmpty()) {
            // For image posts, show first image
            loadSupabaseImage(itemView.imageView, post.mediaUrls[0])
        }
    }
}
```

---

## Step 6: Handle Video Posts

### 6.1 Video Player Setup

For video posts with autoplay (Instagram-style):

```kotlin
import android.widget.VideoView
import android.net.Uri

fun setupVideoPlayer(
    videoView: VideoView,
    videoUrl: String,
    thumbnailUrl: String? = null
) {
    val videoUri = Uri.parse(videoUrl)
    videoView.setVideoURI(videoUri)
    
    // Set poster (thumbnail) if available
    if (!thumbnailUrl.isNullOrEmpty()) {
        // Glide can load thumbnail as poster
        Glide.with(videoView.context)
            .load(thumbnailUrl)
            .into(videoView as? ImageView) // If using ExoPlayer, use different approach
    }
    
    videoView.setOnPreparedListener { mediaPlayer ->
        mediaPlayer.isLooping = true
        mediaPlayer.setVolume(0f, 0f) // Mute for autoplay
    }
    
    // Start playback
    videoView.start()
}
```

### 6.2 Home Feed with Autoplay

For Instagram-style autoplay in RecyclerView:

```kotlin
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.LinearLayoutManager

class HomeFeedActivity : AppCompatActivity() {
    private lateinit var recyclerView: RecyclerView
    private var currentPlayingPosition = -1
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home_feed)
        
        recyclerView = findViewById(R.id.recyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        
        // Add scroll listener for autoplay
        recyclerView.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                findAndPlayVideo()
            }
        })
    }
    
    private fun findAndPlayVideo() {
        val layoutManager = recyclerView.layoutManager as? LinearLayoutManager
        val firstVisible = layoutManager?.findFirstVisibleItemPosition() ?: return
        val lastVisible = layoutManager.findLastVisibleItemPosition()
        
        // Find the most visible video post
        var mostVisiblePosition = -1
        var maxVisibleArea = 0
        
        for (i in firstVisible..lastVisible) {
            val viewHolder = recyclerView.findViewHolderForAdapterPosition(i)
            if (viewHolder is VideoPostViewHolder) {
                val visibleArea = calculateVisibleArea(viewHolder.itemView)
                if (visibleArea > maxVisibleArea) {
                    maxVisibleArea = visibleArea
                    mostVisiblePosition = i
                }
            }
        }
        
        // Play the most visible video, pause others
        if (mostVisiblePosition != currentPlayingPosition) {
            pauseAllVideos()
            if (mostVisiblePosition >= 0) {
                playVideoAtPosition(mostVisiblePosition)
                currentPlayingPosition = mostVisiblePosition
            }
        }
    }
    
    private fun calculateVisibleArea(view: View): Int {
        val rect = android.graphics.Rect()
        view.getGlobalVisibleRect(rect)
        return rect.height() * rect.width()
    }
}
```

---

## Step 7: Add Internet Permission

Ensure you have internet permission in `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:usesCleartextTraffic="true"
        ...>
        <!-- Your activities -->
    </application>
</manifest>
```

**Note**: `usesCleartextTraffic="true"` allows HTTP connections. If your backend uses HTTPS (which it should), you can remove this.

---

## Step 8: Environment Configuration

### 8.1 Create Configuration File

Create `app/src/main/java/com/yourpackage/config/AppConfig.kt`:

```kotlin
object AppConfig {
    // Backend Configuration
    const val BACKEND_BASE_URL = "https://backend-nest-08qw.onrender.com"
    const val API_BASE_URL = "$BACKEND_BASE_URL/api"
    
    // Supabase Configuration
    const val SUPABASE_URL = "https://bhfpudsrynnsxzazmcjd.supabase.co"
    const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY" // Replace with your key
    const val SUPABASE_BUCKET_NAME = "uploads"
    
    // Build Configuration
    const val IS_DEBUG = BuildConfig.DEBUG
}
```

### 8.2 Get Supabase Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **anon/public** key
5. Replace `YOUR_SUPABASE_ANON_KEY` in your config

---

## Step 9: Testing Checklist

### 9.1 Backend Connectivity
- [ ] Test API calls to backend
- [ ] Verify authentication works
- [ ] Check response formats match your models

### 9.2 Supabase Storage
- [ ] Test image upload to Supabase
- [ ] Test video upload to Supabase
- [ ] Verify images display correctly from Supabase URLs
- [ ] Check thumbnail generation for videos

### 9.3 Post Creation
- [ ] Create image post
- [ ] Create video post (verify thumbnail is generated)
- [ ] Verify posts appear in feed
- [ ] Check profile displays thumbnails for video posts

### 9.4 Video Playback
- [ ] Videos play in feed
- [ ] Only one video plays at a time (autoplay)
- [ ] Videos pause when scrolled away
- [ ] Thumbnails display before video loads

---

## Step 10: Common Issues & Solutions

### Issue 1: Network Security Config (HTTPS)
If you get SSL/Cleartext errors, create `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

Then reference it in `AndroidManifest.xml`:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### Issue 2: Timeout Errors
Increase timeout values in `ApiConfig` if you experience timeouts with large file uploads.

### Issue 3: CORS Errors
The backend should handle CORS. If you encounter issues, check backend CORS configuration.

### Issue 4: Image Not Loading
- Verify Supabase bucket is public
- Check image URL format
- Verify Glide is properly configured
- Check network permissions

---

## Step 11: Migration Checklist

When migrating from local backend to production:

1. **Update API URLs**
   - [ ] Replace localhost/emulator IPs with production URL
   - [ ] Update all endpoint constants
   - [ ] Test all API calls

2. **Update File Uploads**
   - [ ] Replace local file storage with Supabase uploads
   - [ ] Update image loading to use Supabase URLs
   - [ ] Test video upload and thumbnail generation

3. **Update Models**
   - [ ] Add `thumbnailUrl` field to Post model
   - [ ] Update response parsing
   - [ ] Handle nullable fields properly

4. **Testing**
   - [ ] Test on physical device
   - [ ] Test on emulator
   - [ ] Verify all features work with production backend

---

## Additional Resources

- **Backend Swagger Docs**: https://backend-nest-08qw.onrender.com/api
- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Android SDK**: https://github.com/supabase/supabase-kt
- **Retrofit Documentation**: https://square.github.io/retrofit/
- **Glide Documentation**: https://bumptech.github.io/glide/

---

## Support

If you encounter issues:
1. Check backend logs in Render dashboard
2. Check Supabase Storage logs
3. Verify API responses using Swagger or Postman
4. Check Android Logcat for error messages

Good luck with your Android integration! 🚀


