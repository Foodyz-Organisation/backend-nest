# Frontend Implementation Guide: Video Posts with Thumbnails and Autoplay

## Overview

This guide explains how to implement video posts with automatic thumbnail generation and Instagram-style autoplay in the home feed.

## Backend Changes Summary

1. **Video Upload Flow**: When a video is uploaded via `/posts/uploads`, the backend now:
   - Uploads the video to Supabase Storage
   - Automatically generates a thumbnail from the video (at 1 second mark)
   - Uploads the thumbnail to Supabase Storage
   - Returns both URLs in the response: `[videoUrl, thumbnailUrl]`

2. **Post Creation**: When creating a reel post:
   - The backend automatically extracts the thumbnail URL from `mediaUrls`
   - Stores it in the `thumbnailUrl` field of the post
   - Removes the thumbnail URL from the `mediaUrls` array (keeps only video URLs)

## Frontend Implementation

### 1. Uploading Video Files

```typescript
// Example: Upload video file
const uploadVideo = async (videoFile: File) => {
  const formData = new FormData();
  formData.append('files', videoFile);

  const response = await fetch(`${API_URL}/posts/uploads`, {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type - let browser set it with boundary
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  // data.urls will contain: [videoUrl, thumbnailUrl]
  // Example: [
  //   "https://...supabase.co/storage/v1/object/public/uploads/posts/video-123.mp4",
  //   "https://...supabase.co/storage/v1/object/public/uploads/posts/thumbnails/thumb-123.png"
  // ]
  
  return data.urls;
};
```

### 2. Creating a Reel Post

```typescript
// Example: Create reel post with uploaded URLs
const createReelPost = async (videoUrl: string, thumbnailUrl: string, caption: string) => {
  // Note: Include BOTH video and thumbnail URLs in mediaUrls
  // The backend will extract thumbnail and store it separately
  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-id': userId,
      'x-owner-type': 'UserAccount', // or 'ProfessionalAccount'
    },
    body: JSON.stringify({
      caption: caption,
      mediaUrls: [videoUrl, thumbnailUrl], // Include both URLs
      mediaType: 'reel',
      foodType: 'Spicy', // Your food type enum value
    }),
  });

  const post = await response.json();
  // Post will have:
  // - mediaUrls: [videoUrl] (thumbnail removed)
  // - thumbnailUrl: "https://...thumbnails/thumb-123.png"
  
  return post;
};
```

### 3. Displaying Posts in Profile

```tsx
// Example: Display video post thumbnail in user profile
const ProfileVideoPost = ({ post }) => {
  return (
    <div className="video-post-thumbnail">
      {/* Use thumbnailUrl for reel posts */}
      {post.mediaType === 'reel' && post.thumbnailUrl ? (
        <img 
          src={post.thumbnailUrl} 
          alt={post.caption}
          onClick={() => navigateToPost(post._id)}
        />
      ) : (
        // For image posts, use first mediaUrl
        <img src={post.mediaUrls[0]} alt={post.caption} />
      )}
    </div>
  );
};
```

### 4. Home Feed with Autoplay (Instagram-style)

```tsx
// Example: Home feed with autoplay videos
import { useEffect, useRef, useState } from 'react';

const HomeFeed = () => {
  const [posts, setPosts] = useState([]);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Setup Intersection Observer for autoplay
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoId = entry.target.getAttribute('data-video-id');
          const video = videoRefs.current[videoId];
          
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is at least 50% visible - play it
            video?.play().catch(console.error);
          } else {
            // Video is not visible - pause it
            video?.pause();
          }
        });
      },
      {
        threshold: [0, 0.5, 1], // Trigger at 0%, 50%, and 100% visibility
        rootMargin: '-10% 0px -10% 0px', // Consider video visible only when 10% from top/bottom
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // Observe all video elements when posts change
    Object.values(videoRefs.current).forEach((video) => {
      if (video && observerRef.current) {
        observerRef.current.observe(video);
      }
    });
  }, [posts]);

  return (
    <div className="home-feed">
      {posts.map((post) => (
        <div key={post._id} className="post-container">
          {post.mediaType === 'reel' ? (
            <div className="video-post">
              <video
                ref={(el) => {
                  if (el) videoRefs.current[post._id] = el;
                }}
                data-video-id={post._id}
                src={post.mediaUrls[0]} // Video URL
                poster={post.thumbnailUrl} // Thumbnail as poster
                loop
                muted // Required for autoplay in most browsers
                playsInline // Required for iOS
                className="feed-video"
              />
              {/* Video controls overlay */}
              <div className="video-overlay">
                <button onClick={() => togglePlayPause(post._id)}>⏯️</button>
              </div>
            </div>
          ) : (
            <img src={post.mediaUrls[0]} alt={post.caption} />
          )}
          <p>{post.caption}</p>
        </div>
      ))}
    </div>
  );

  const togglePlayPause = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  };
};
```

### 5. React Native Implementation (if using React Native)

```tsx
import { View, Video, Image } from 'react-native';
import { useScrollHandler } from 'react-native-reanimated';

const HomeFeed = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setVisibleIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Video must be 50% visible
  }).current;

  return (
    <FlatList
      ref={scrollViewRef}
      data={posts}
      renderItem={({ item, index }) => (
        <View style={{ height: SCREEN_HEIGHT }}>
          {item.mediaType === 'reel' ? (
            <Video
              source={{ uri: item.mediaUrls[0] }}
              poster={item.thumbnailUrl} // Thumbnail shown before video loads
              paused={index !== visibleIndex} // Pause all except visible video
              repeat
              resizeMode="contain"
              style={{ flex: 1 }}
            />
          ) : (
            <Image source={{ uri: item.mediaUrls[0] }} style={{ flex: 1 }} />
          )}
        </View>
      )}
      keyExtractor={(item) => item._id}
      snapToInterval={SCREEN_HEIGHT}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
};
```

## API Response Structure

### Upload Response
```json
{
  "urls": [
    "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/posts/1234567890-abc123.mp4",
    "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/posts/thumbnails/1234567890-xyz789.png"
  ]
}
```

### Post Response (after creation)
```json
{
  "_id": "60c72b2f9b1d8c001c8e4d1a",
  "caption": "Amazing food!",
  "mediaType": "reel",
  "mediaUrls": [
    "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/posts/1234567890-abc123.mp4"
  ],
  "thumbnailUrl": "https://bhfpudsrynnsxzazmcjd.supabase.co/storage/v1/object/public/uploads/posts/thumbnails/1234567890-xyz789.png",
  "foodType": "Spicy",
  "ownerId": {...},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Key Points

1. **Thumbnail Generation**: Thumbnails are automatically generated by the backend - you don't need to generate them on the frontend.

2. **Video Autoplay**: 
   - Use Intersection Observer API (web) or FlatList viewability callbacks (React Native)
   - Videos should be muted for autoplay to work in browsers
   - Only the most visible video should play

3. **Performance**:
   - Use `poster` attribute to show thumbnail while video loads
   - Implement lazy loading for videos
   - Pause videos when they're not visible to save bandwidth

4. **Error Handling**: 
   - If thumbnail generation fails, the video will still be uploaded
   - Check for `thumbnailUrl` before displaying thumbnail in profile

## Testing Checklist

- [ ] Video uploads successfully
- [ ] Thumbnail is generated and uploaded
- [ ] Post creation extracts thumbnail correctly
- [ ] Thumbnail displays in user profile
- [ ] Videos autoplay when scrolling in home feed
- [ ] Only one video plays at a time
- [ ] Videos pause when scrolled out of view
- [ ] Thumbnail shows as poster while video loads

