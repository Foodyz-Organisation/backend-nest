# Android Jetpack Compose - Migrate to Implicit Food Preference System

Use this prompt to update your Android Jetpack Compose frontend from the explicit preference system to the new implicit, recency-driven preference system.

---

## Backend Changes Overview

### What Changed:

1. **Preferences are now implicit**: The backend automatically tracks preferences from user interactions (likes, comments, saves, views)
2. **No explicit "prefer" action needed**: The `POST /posts/:postId/prefer-foodtype` endpoint still exists but is optional
3. **Feed prioritization updated**: 
   - **50%** most recently interacted food type
   - **20%** other preferred food types
   - **30%** general content
4. **View tracking**: When viewing a post detail with `x-user-id` header, it automatically tracks the interaction

### What Stayed the Same:

- All interaction endpoints remain the same (like, comment, save)
- Feed endpoint (`GET /posts`) works the same way
- `preferredFoodTypes` array in UserAccount still exists and is populated automatically

---

## Frontend Migration Requirements

### Step 1: Remove Explicit Preference UI Components

#### A. Remove Preference Button

**Find and remove** any UI components related to explicit preference actions:

- `PreferFoodTypeButton` composable (if you have one)
- Any buttons/icons for "Add to Preferences" or "Prefer This Food Type"
- Preference indicators that show "preferred" state for individual posts

**What to look for:**
- Composables with names like `PreferFoodTypeButton`, `PreferenceButton`, `AddPreferenceButton`
- Icons/buttons with "prefer", "preference", "add to preferences" labels
- Any click handlers calling `preferFoodType()` API method

**Example of what to remove:**
```kotlin
// ❌ REMOVE THIS TYPE OF COMPONENT
@Composable
fun PreferFoodTypeButton(
    post: Post,
    isPreferred: Boolean,
    onPreferClick: () -> Unit
) {
    // Remove this entire composable
}
```

#### B. Remove Preference-related ViewModel Methods

**Find and remove or deprecate** methods related to explicit preferences:

```kotlin
// ❌ REMOVE OR DEPRECATE THIS METHOD
fun preferFoodType(postId: String) {
    viewModelScope.launch {
        try {
            val updatedUser = postsRepository.preferFoodType(postId, userId)
            _userPreferences.value = updatedUser.preferredFoodTypes
            // ...
        } catch (e: Exception) {
            // ...
        }
    }
}
```

**Keep the method if you still want to support explicit preferences**, but mark it as optional/legacy:

```kotlin
// ✅ OPTIONAL: Keep but mark as legacy/optional
@Deprecated("Preferences are now tracked implicitly. Use only for explicit user preference actions.")
fun preferFoodType(postId: String) {
    // Keep implementation if you want explicit preference as optional feature
}
```

---

### Step 2: Update Feed Loading Logic

#### A. Remove Preference State Management (Optional)

**You can simplify** your ViewModel by removing explicit preference tracking state:

**Before (Explicit System):**
```kotlin
// ❌ You can remove this if not needed
private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
val userPreferences: StateFlow<List<String>> = _userPreferences.asStateFlow()

fun isFoodTypePreferred(foodType: String): Boolean {
    return _userPreferences.value.contains(foodType)
}
```

**After (Implicit System):**
```kotlin
// ✅ Preferences are tracked on backend, no need to maintain local state
// The feed will automatically be personalized based on backend tracking
```

**OR keep it for UI display purposes** (e.g., showing user's preferences in settings):

```kotlin
// ✅ Keep if you want to display user preferences in settings/profile
private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
val userPreferences: StateFlow<List<String>> = _userPreferences.asStateFlow()

// Load preferences from user profile, not from preferFoodType endpoint
fun loadUserPreferences() {
    viewModelScope.launch {
        val user = userRepository.getCurrentUser()
        _userPreferences.value = user?.preferredFoodTypes ?: emptyList()
    }
}
```

#### B. Update Feed Loading

**No changes needed** to feed loading logic! The backend handles prioritization automatically:

```kotlin
// ✅ This remains the same - backend handles prioritization
fun loadFeed() {
    viewModelScope.launch {
        _isLoading.value = true
        try {
            val fetchedPosts = postsRepository.getPosts(currentUserId)
            _posts.value = fetchedPosts
            // Feed is already personalized by backend (50/20/30 split)
        } catch (e: Exception) {
            _error.value = e.message ?: "Failed to load feed"
        } finally {
            _isLoading.value = false
        }
    }
}
```

**The feed will automatically:**
- Show 50% of most recently interacted food type
- Show 20% of other preferred food types  
- Show 30% general content
- Fall back to 70/30 if user has no recent interactions

---

### Step 3: Add View Tracking for Post Details

#### A. Update Post Detail API Call

**When viewing a post detail**, send the `x-user-id` header to enable automatic preference tracking:

**Update your Repository/API Service:**

```kotlin
interface PostsApi {
    // ✅ Update this method to include x-user-id header
    @GET("posts/{postId}")
    suspend fun getPost(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String? = null  // Add optional userId header
    ): Post
    
    // Other methods remain the same...
}
```

**Update your Repository:**

```kotlin
class PostsRepository(
    private val api: PostsApi,
    private val userRepository: UserRepository
) {
    suspend fun getPost(postId: String): Post {
        val userId = userRepository.getCurrentUserId()
        return api.getPost(postId, userId)  // Pass userId if available
    }
}
```

#### B. Update ViewModel for Post Details

**No changes needed** if you're already using the repository pattern:

```kotlin
// ✅ This remains the same - repository handles userId automatically
fun loadPostDetail(postId: String) {
    viewModelScope.launch {
        _isLoading.value = true
        try {
            val post = postsRepository.getPost(postId)
            _selectedPost.value = post
            // Backend automatically tracks view if userId is sent
        } catch (e: Exception) {
            _error.value = "Failed to load post"
        } finally {
            _isLoading.value = false
        }
    }
}
```

---

### Step 4: Update UI Components

#### A. Remove Preference Buttons from Post Cards

**Remove preference buttons** from your post list/grid items:

**Before:**
```kotlin
@Composable
fun PostCard(
    post: Post,
    viewModel: PostsViewModel,
    modifier: Modifier = Modifier
) {
    // ... post image, caption, etc.
    
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row {
            LikeButton(post = post, onLikeClick = { /* ... */ })
            CommentButton(post = post, onCommentClick = { /* ... */ })
            ShareButton(post = post, onShareClick = { /* ... */ })
        }
        
        Row {
            // ❌ REMOVE THIS
            PreferFoodTypeButton(
                post = post,
                isPreferred = viewModel.isFoodTypePreferred(post.foodType),
                onPreferClick = { viewModel.preferFoodType(post._id) }
            )
            
            SaveButton(post = post, onSaveClick = { /* ... */ })
        }
    }
}
```

**After:**
```kotlin
@Composable
fun PostCard(
    post: Post,
    viewModel: PostsViewModel,
    modifier: Modifier = Modifier
) {
    // ... post image, caption, etc.
    
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row {
            LikeButton(post = post, onLikeClick = { /* ... */ })
            CommentButton(post = post, onCommentClick = { /* ... */ })
            ShareButton(post = post, onShareClick = { /* ... */ })
        }
        
        Row {
            // ✅ Only keep Save button - preferences tracked automatically
            SaveButton(post = post, onSaveClick = { /* ... */ })
        }
    }
}
```

#### B. Keep Food Type Display

**Keep displaying food types** (they're still part of the post):

```kotlin
// ✅ Keep this - food type display is still useful
FoodTypeChip(foodType = post.foodType)
```

---

### Step 5: Update Interaction Handlers

#### A. Interactions Now Auto-Track Preferences

**No code changes needed!** Your existing interaction handlers already work:

```kotlin
// ✅ These methods remain the same
fun likePost(postId: String) {
    viewModelScope.launch {
        try {
            val updatedPost = postsRepository.likePost(postId, userId)
            // Backend automatically tracks preference from this like
            updatePostInList(updatedPost)
        } catch (e: Exception) {
            _error.value = "Failed to like post"
        }
    }
}

fun savePost(postId: String) {
    viewModelScope.launch {
        try {
            val updatedPost = postsRepository.savePost(postId, userId)
            // Backend automatically tracks preference from this save
            updatePostInList(updatedPost)
        } catch (e: Exception) {
            _error.value = "Failed to save post"
        }
    }
}

fun commentOnPost(postId: String, commentText: String) {
    viewModelScope.launch {
        try {
            val comment = postsRepository.createComment(postId, userId, commentText)
            // Backend automatically tracks preference from this comment
            addCommentToPost(comment)
        } catch (e: Exception) {
            _error.value = "Failed to comment"
        }
    }
}
```

**The backend automatically:**
- Adds the post's `foodType` to user's `preferredFoodTypes` (if not already present)
- Updates `lastInteractedFoodType` with the post's food type
- Updates `lastInteractionTimestamp`
- Prioritizes that food type in the next feed load

---

### Step 6: Update Feed Refresh Logic

#### A. Feed Automatically Personalizes

**Your feed refresh logic can remain the same**, but understand that:

1. **First load**: If user has no interactions, shows general feed
2. **After interactions**: Feed automatically shows personalized content (50/20/30 split)
3. **No manual refresh needed**: Preferences are tracked in real-time

**Optional Enhancement - Show Personalization Indicator:**

```kotlin
@Composable
fun HomeFeedScreen(viewModel: PostsViewModel = hiltViewModel()) {
    val posts by viewModel.posts.collectAsState()
    val userPreferences by viewModel.userPreferences.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize()) {
        // ✅ Optional: Show indicator if feed is personalized
        if (userPreferences.isNotEmpty()) {
            PersonalizationIndicator(
                text = "Personalized for you based on your interactions",
                modifier = Modifier.padding(16.dp)
            )
        }
        
        // Feed content
        LazyColumn {
            items(posts) { post ->
                PostCard(post = post, viewModel = viewModel)
            }
        }
    }
}
```

---

### Step 7: Update User Profile/Settings (Optional)

#### A. Display User Preferences (Read-Only)

**If you want to show user's preferences in settings/profile**, load them from user profile:

```kotlin
class UserViewModel : ViewModel() {
    private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
    val userPreferences: StateFlow<List<String>> = _userPreferences.asStateFlow()
    
    fun loadUserProfile() {
        viewModelScope.launch {
            try {
                val user = userRepository.getCurrentUser()
                _userPreferences.value = user?.preferredFoodTypes ?: emptyList()
                // These are automatically updated by backend from interactions
            } catch (e: Exception) {
                _error.value = "Failed to load profile"
            }
        }
    }
}
```

**Display in Settings UI:**

```kotlin
@Composable
fun PreferencesScreen(viewModel: UserViewModel) {
    val preferences by viewModel.userPreferences.collectAsState()
    
    Column {
        Text(
            text = "Your Food Preferences",
            style = MaterialTheme.typography.h6
        )
        Text(
            text = "These preferences are automatically learned from your interactions",
            style = MaterialTheme.typography.caption
        )
        
        // Display preferences as chips
        FlowRow {
            preferences.forEach { foodType ->
                FoodTypeChip(foodType = foodType)
            }
        }
    }
}
```

---

## Migration Checklist

### Code Removal:
- [ ] Remove `PreferFoodTypeButton` composable
- [ ] Remove preference button from `PostCard` component
- [ ] Remove or deprecate `preferFoodType()` method from ViewModel/Repository
- [ ] Remove `isFoodTypePreferred()` method (or keep for display purposes only)
- [ ] Remove preference-related click handlers from post cards

### Code Updates:
- [ ] Update `GET /posts/:id` API call to include optional `x-user-id` header
- [ ] Update Repository to pass `userId` when fetching post details
- [ ] Verify interaction handlers (like, comment, save) still work (they should)
- [ ] Update feed loading to rely on backend prioritization (usually no changes needed)

### Optional Enhancements:
- [ ] Add personalization indicator to feed screen
- [ ] Update user profile/settings to show automatically-learned preferences
- [ ] Add informational text explaining implicit preference system

### Testing:
- [ ] Test that liking a post doesn't require explicit preference action
- [ ] Test that feed shows personalized content after interactions
- [ ] Test that viewing post details tracks interaction (check backend logs)
- [ ] Test that commenting on a post updates preferences
- [ ] Test that saving a post updates preferences
- [ ] Verify feed prioritization works (50/20/30 split after interactions)

---

## Example Complete Migration

### Before (Explicit System):

```kotlin
// ViewModel
class PostsViewModel : ViewModel() {
    private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
    
    fun preferFoodType(postId: String) {
        viewModelScope.launch {
            val updatedUser = postsRepository.preferFoodType(postId, userId)
            _userPreferences.value = updatedUser.preferredFoodTypes
        }
    }
    
    fun isFoodTypePreferred(foodType: String): Boolean {
        return _userPreferences.value.contains(foodType)
    }
}

// UI
@Composable
fun PostCard(post: Post, viewModel: PostsViewModel) {
    Row {
        LikeButton(onClick = { /* like */ })
        PreferFoodTypeButton(
            isPreferred = viewModel.isFoodTypePreferred(post.foodType),
            onClick = { viewModel.preferFoodType(post._id) }
        )
        SaveButton(onClick = { /* save */ })
    }
}
```

### After (Implicit System):

```kotlin
// ViewModel
class PostsViewModel : ViewModel() {
    // ✅ Remove preference tracking methods (optional - keep for display only)
    // Preferences are tracked automatically on backend
    
    // Interactions automatically track preferences
    fun likePost(postId: String) {
        viewModelScope.launch {
            postsRepository.likePost(postId, userId)
            // Backend automatically tracks preference
        }
    }
}

// UI
@Composable
fun PostCard(post: Post, viewModel: PostsViewModel) {
    Row {
        LikeButton(onClick = { viewModel.likePost(post._id) })
        // ✅ Remove PreferFoodTypeButton - preferences tracked automatically
        SaveButton(onClick = { viewModel.savePost(post._id) })
    }
    
    // ✅ Keep food type display
    FoodTypeChip(foodType = post.foodType)
}
```

---

## Key Points to Remember

1. **Preferences are automatic**: No user action needed - backend tracks from interactions
2. **Feed is personalized**: Backend handles 50/20/30 prioritization automatically
3. **View tracking**: Include `x-user-id` header when fetching post details
4. **Interactions update preferences**: Likes, comments, saves automatically update preferences
5. **No explicit UI needed**: Remove preference buttons, but keep food type display

---

## Backward Compatibility

- The `POST /posts/:postId/prefer-foodtype` endpoint still exists if you want to keep explicit preference as an optional feature
- Existing interaction endpoints work the same way
- Feed endpoint works the same, but with better personalization
- User's existing `preferredFoodTypes` are preserved and continue to work

---

## Benefits of Implicit System

1. **Better UX**: Users don't need to explicitly "prefer" food types - it happens naturally
2. **More accurate**: Preferences reflect actual user behavior, not just explicit choices
3. **Recency-driven**: Most recently interacted food types get priority
4. **Less UI clutter**: Removes need for preference buttons
5. **Automatic updates**: Feed personalizes as users interact, no manual refresh needed

---

**Please update your Android Jetpack Compose frontend following these guidelines. The migration should be straightforward - mainly removing explicit preference UI components and ensuring view tracking includes the userId header.**

