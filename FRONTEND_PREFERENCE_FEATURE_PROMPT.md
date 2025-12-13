# Frontend Integration Prompt - Food Type Preference & Personalized Feed

Use this prompt to implement the food type preference feature and personalized feed in your Android Jetpack Compose application.

---

## Context

I have a NestJS backend API for a food social media app. I need to implement a food type preference feature that:

1. Allows normal users to explicitly "prefer" a post's food type (adds it to their preferences)
2. Personalizes the home feed based on user preferences (70% preferred food types, 30% general)
3. Works seamlessly with the existing post feed

## Backend API Details

**Base URL**: `http://10.0.2.2:3000` (for Android Emulator)

### Endpoint 1: Add Food Type Preference

**POST** `/posts/:postId/prefer-foodtype`

**Description**: Adds the food type of a specific post to the user's preferred food types list. This enables personalized feed recommendations.

**Headers**:
```
x-user-id: <normal-user-id> (required)
```

**Path Parameters**:
- `postId` (String): The ID of the post whose food type should be added to preferences

**Request Example**:
```http
POST http://10.0.2.2:3000/posts/65a1b2c3d4e5f6g7h8i9j0k1/prefer-foodtype
Headers:
  x-user-id: 60c72b2f9b1d8c001c8e4d1a
```

**Response** (200 OK):
```json
{
  "_id": "60c72b2f9b1d8c001c8e4d1a",
  "username": "user123",
  "fullName": "John Doe",
  "preferredFoodTypes": ["Spicy", "Seafood", "Street food"],
  // ... other user fields
}
```

**Response Codes**:
- `200 OK`: Food type added successfully
- `400 Bad Request`: Invalid post ID or user ID format, or post has no food type
- `404 Not Found`: Post or user not found

**Important Notes**:
- This endpoint is idempotent - calling it multiple times with the same post won't create duplicates
- The food type is automatically extracted from the post
- Only normal users (UserAccount) should use this endpoint

---

### Endpoint 2: Get Personalized Feed

**GET** `/posts`

**Description**: Returns a personalized feed of posts. If user is authenticated and has food preferences, returns 70% preferred food types and 30% general posts. Otherwise returns general feed.

**Headers** (Optional):
```
x-user-id: <normal-user-id>
```

**Request Examples**:

**With Personalization** (User has preferences):
```http
GET http://10.0.2.2:3000/posts
Headers:
  x-user-id: 60c72b2f9b1d8c001c8e4d1a
```

**Without Personalization** (No header or no preferences):
```http
GET http://10.0.2.2:3000/posts
```

**Response** (200 OK):
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "ownerId": "60c72b2f9b1d8c001c8e4d1a",
    "ownerModel": "UserAccount",
    "caption": "Amazing spicy dish!",
    "mediaUrls": ["http://10.0.2.2:3000/uploads/image.jpg"],
    "mediaType": "image",
    "foodType": "Spicy",
    "price": 30.0,
    "preparationTime": 15,
    "likeCount": 10,
    "commentCount": 3,
    "saveCount": 5,
    "ownerId_populated": {
      "_id": "60c72b2f9b1d8c001c8e4d1a",
      "username": "chef_ahmed",
      "fullName": "Ahmed Ben Ali",
      "profilePictureUrl": "http://10.0.2.2:3000/uploads/profile.jpg"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
  // ... more posts (70% preferred, 30% general if user has preferences)
]
```

**Feed Logic**:
- **If user has preferences**: Returns ~35 posts matching preferred food types + ~15 general posts (70/30 split)
- **If user has no preferences**: Returns 50 general posts
- **If no userId header**: Returns 50 general posts
- Posts are sorted by `createdAt: -1` (newest first)

---

## UI/UX Requirements

### 1. Preference Button/Indicator

**Location**: On each post card or post detail screen

**States**:
- **Not Preferred**: Show "Prefer" button or icon (e.g., heart outline, star outline, or "Add to Preferences")
- **Preferred**: Show "Preferred ✓" or filled icon (different color, e.g., filled heart/star)
- **Loading**: Show loading indicator while API call is in progress
- **Error**: Show error message or retry option

**Visual Design**:
- Can be a small button, icon, or badge
- Should be visually distinct but not intrusive
- Consider placing it near other interaction buttons (like, comment, save)

**Example Placement**:
```
[Post Image]
[Like] [Comment] [Share] [Prefer] [Save]
```

### 2. Feed Display

**Home Feed Screen**:
- Automatically loads personalized feed if user is logged in
- Shows loading indicator while fetching
- Displays posts in a scrollable list/grid
- Shows "Personalized for you" indicator if preferences are active (optional)

**Feed Behavior**:
- If user has preferences: Show mix of preferred + general posts
- If user has no preferences: Show general feed with message like "Interact with posts to personalize your feed" (optional)
- Pull-to-refresh to reload feed
- Infinite scroll/pagination (if implemented)

### 3. Preference Management (Optional)

**Settings/Profile Section**:
- Show list of preferred food types
- Allow users to remove preferences
- Show count of preferred types
- Visual representation (chips/badges)

---

## Implementation Requirements

### 1. Data Models

```kotlin
// Update UserAccount model
data class UserAccount(
    val _id: String,
    val username: String,
    val fullName: String,
    // ... other fields
    val preferredFoodTypes: List<String> = emptyList() // NEW
)

// Post model (should already exist)
data class Post(
    val _id: String,
    val caption: String,
    val mediaUrls: List<String>,
    val foodType: String, // Required field
    val price: Double? = null,
    val preparationTime: Int? = null,
    // ... other fields
    val isPreferred: Boolean = false // Local state to track if this post's food type is preferred
)
```

### 2. API Service (Retrofit)

```kotlin
interface PostsApi {
    // Existing endpoints...
    
    @POST("posts/{postId}/prefer-foodtype")
    @Headers("x-user-id: {userId}")
    suspend fun preferFoodType(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String
    ): UserAccount
    
    @GET("posts")
    suspend fun getPosts(
        @Header("x-user-id") userId: String? = null
    ): List<Post>
}
```

### 3. Repository/ViewModel

```kotlin
class PostsViewModel(
    private val postsRepository: PostsRepository,
    private val userRepository: UserRepository
) : ViewModel() {
    
    // Feed state
    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()
    
    // Loading state
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    // Error state
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // User preferences (cached)
    private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
    val userPreferences: StateFlow<List<String>> = _userPreferences.asStateFlow()
    
    // Current user ID
    private val currentUserId: String? = userRepository.getCurrentUserId()
    
    // Load personalized feed
    fun loadFeed() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val fetchedPosts = postsRepository.getPosts(currentUserId)
                _posts.value = fetchedPosts
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load feed"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    // Prefer a post's food type
    fun preferFoodType(postId: String) {
        val userId = currentUserId ?: return
        
        viewModelScope.launch {
            try {
                val updatedUser = postsRepository.preferFoodType(postId, userId)
                
                // Update local preferences
                _userPreferences.value = updatedUser.preferredFoodTypes
                
                // Update post's preferred state
                _posts.value = _posts.value.map { post ->
                    if (post._id == postId) {
                        post.copy(isPreferred = true)
                    } else {
                        post
                    }
                }
                
                // Optionally reload feed to get personalized results
                // loadFeed()
                
            } catch (e: Exception) {
                _error.value = "Failed to add preference: ${e.message}"
            }
        }
    }
    
    // Check if post's food type is preferred
    fun isFoodTypePreferred(foodType: String): Boolean {
        return _userPreferences.value.contains(foodType)
    }
    
    // Refresh feed
    fun refreshFeed() {
        loadFeed()
    }
}
```

### 4. UI Components

#### A. Preference Button Composable

```kotlin
@Composable
fun PreferFoodTypeButton(
    post: Post,
    isPreferred: Boolean,
    isLoading: Boolean,
    onPreferClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val icon = if (isPreferred) {
        Icons.Default.Favorite // or Star, ThumbUp, etc.
    } else {
        Icons.Default.FavoriteBorder
    }
    
    val color = if (isPreferred) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
    
    IconButton(
        onClick = onPreferClick,
        enabled = !isLoading,
        modifier = modifier
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp
            )
        } else {
            Icon(
                imageVector = icon,
                contentDescription = if (isPreferred) "Remove preference" else "Add to preferences",
                tint = color,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
```

#### B. Post Card with Preference Button

```kotlin
@Composable
fun PostCard(
    post: Post,
    viewModel: PostsViewModel,
    modifier: Modifier = Modifier
) {
    val isPreferred = remember(post._id) {
        viewModel.isFoodTypePreferred(post.foodType)
    }
    
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column {
            // Post image
            AsyncImage(
                model = post.mediaUrls.firstOrNull(),
                contentDescription = post.caption,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .clip(RoundedCornerShape(8.dp))
            )
            
            // Post actions row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Like button
                    LikeButton(post = post, onLikeClick = { /* ... */ })
                    
                    // Comment button
                    CommentButton(post = post, onCommentClick = { /* ... */ })
                    
                    // Share button
                    ShareButton(post = post, onShareClick = { /* ... */ })
                }
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Prefer button
                    PreferFoodTypeButton(
                        post = post,
                        isPreferred = isPreferred,
                        isLoading = false, // Track loading state per post
                        onPreferClick = {
                            viewModel.preferFoodType(post._id)
                        }
                    )
                    
                    // Save button
                    SaveButton(post = post, onSaveClick = { /* ... */ })
                }
            }
            
            // Post details
            Text(
                text = post.caption,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            
            // Food type badge
            FoodTypeChip(foodType = post.foodType)
        }
    }
}
```

#### C. Feed Screen

```kotlin
@Composable
fun HomeFeedScreen(
    viewModel: PostsViewModel = hiltViewModel()
) {
    val posts by viewModel.posts.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val userPreferences by viewModel.userPreferences.collectAsState()
    
    // Load feed on first composition
    LaunchedEffect(Unit) {
        viewModel.loadFeed()
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Optional: Show personalized indicator
        if (userPreferences.isNotEmpty()) {
            PersonalizedFeedBanner(
                preferredTypes = userPreferences,
                modifier = Modifier.fillMaxWidth()
            )
        }
        
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            
            error != null -> {
                ErrorMessage(
                    message = error!!,
                    onRetry = { viewModel.refreshFeed() }
                )
            }
            
            posts.isEmpty() -> {
                EmptyFeedMessage()
            }
            
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(8.dp)
                ) {
                    items(posts) { post ->
                        PostCard(
                            post = post,
                            viewModel = viewModel,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
```

#### D. Personalized Feed Banner (Optional)

```kotlin
@Composable
fun PersonalizedFeedBanner(
    preferredTypes: List<String>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.padding(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Personalized for you",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Text(
                text = "${preferredTypes.size} preferences",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}
```

---

## User Flow

### Scenario 1: User Prefers a Food Type

1. User views a post with food type "Spicy"
2. User taps "Prefer" button
3. Loading indicator shows on button
4. API call: `POST /posts/{postId}/prefer-foodtype`
5. Button updates to "Preferred ✓" (filled icon)
6. User's preferences are updated locally
7. Optionally: Feed refreshes to show more "Spicy" posts

### Scenario 2: User Views Personalized Feed

1. User opens home feed
2. If user is logged in: API call with `x-user-id` header
3. Backend returns personalized feed (70% preferred, 30% general)
4. Feed displays with posts matching user's preferred food types prioritized
5. Optional banner shows "Personalized for you"

### Scenario 3: User Without Preferences

1. User opens home feed
2. API call without `x-user-id` or user has no preferences
3. Backend returns general feed
4. Feed displays normally
5. Optional message: "Interact with posts to personalize your feed"

---

## State Management Strategy

### Option 1: Per-Post Loading State

Track loading state for each post individually:

```kotlin
private val _preferringPosts = MutableStateFlow<Set<String>>(emptySet())

fun isPreferring(postId: String): Boolean {
    return _preferringPosts.value.contains(postId)
}

fun preferFoodType(postId: String) {
    _preferringPosts.value = _preferringPosts.value + postId
    // ... API call
    _preferringPosts.value = _preferringPosts.value - postId
}
```

### Option 2: Global Loading State

Single loading state for all preference operations (simpler but less granular).

---

## Error Handling

### Network Errors

```kotlin
try {
    val updatedUser = postsRepository.preferFoodType(postId, userId)
    // Success handling
} catch (e: IOException) {
    // Network error
    _error.value = "No internet connection"
} catch (e: HttpException) {
    when (e.code()) {
        400 -> _error.value = "Invalid request"
        404 -> _error.value = "Post or user not found"
        else -> _error.value = "Failed to add preference"
    }
} catch (e: Exception) {
    _error.value = "An unexpected error occurred"
}
```

### User Feedback

- Show Snackbar on success: "Added to preferences"
- Show Snackbar on error: "Failed to add preference. Please try again."
- Show retry button on persistent errors

---

## Performance Considerations

1. **Caching**: Cache user preferences locally to avoid repeated API calls
2. **Debouncing**: Debounce preference button clicks to prevent rapid API calls
3. **Optimistic Updates**: Update UI immediately, rollback on error
4. **Feed Refresh**: Consider if feed should auto-refresh after adding preference (may be too aggressive)

---

## Testing Checklist

- [ ] User can prefer a post's food type
- [ ] Button state updates correctly (preferred/not preferred)
- [ ] Loading indicator shows during API call
- [ ] Error handling works (network errors, 404, etc.)
- [ ] Feed loads personalized content when user has preferences
- [ ] Feed loads general content when user has no preferences
- [ ] Feed works without authentication (no userId header)
- [ ] Duplicate preferences are prevented (idempotent)
- [ ] User preferences are cached locally
- [ ] Pull-to-refresh works correctly
- [ ] Feed shows correct mix (70% preferred, 30% general)
- [ ] Multiple preferences work correctly
- [ ] UI updates immediately on preference change
- [ ] Error messages are user-friendly

---

## Additional Features (Optional)

1. **Preference Management Screen**:
   - View all preferred food types
   - Remove preferences
   - See preference count

2. **Analytics**:
   - Track which food types are most preferred
   - Track feed engagement with personalized vs general posts

3. **Smart Suggestions**:
   - Suggest food types based on user's interaction history
   - Show "You might also like" based on preferences

4. **Preference Badge**:
   - Show badge on posts matching user's preferences
   - "Recommended for you" indicator

---

## Integration Notes

1. **Authentication**: Ensure `x-user-id` header is included in all API calls when user is logged in
2. **User Context**: Store current user ID in UserRepository or similar
3. **State Persistence**: Consider saving user preferences to local storage/database
4. **Feed Refresh**: Decide when to refresh feed (immediately after preference, on pull-to-refresh, or on screen focus)

---

## Example Complete Flow

```kotlin
// 1. User taps prefer button
PreferFoodTypeButton(
    post = post,
    isPreferred = false,
    onPreferClick = {
        viewModel.preferFoodType(post._id)
    }
)

// 2. ViewModel handles the action
fun preferFoodType(postId: String) {
    viewModelScope.launch {
        try {
            val updatedUser = postsRepository.preferFoodType(postId, currentUserId)
            // Update local state
            _userPreferences.value = updatedUser.preferredFoodTypes
            // Show success message
            _snackbarMessage.value = "Added to preferences"
        } catch (e: Exception) {
            _snackbarMessage.value = "Failed to add preference"
        }
    }
}

// 3. Feed automatically shows more of that food type
// (if feed refresh is enabled)
```

---

**Please implement this food type preference feature following the requirements above. Use modern Android development practices with Jetpack Compose, proper state management, error handling, and user feedback.**

