# Android Jetpack Compose - Implicit Preference System Migration Guide

Use this prompt to migrate your Android Jetpack Compose app from the **explicit** food preference system to the new **implicit** preference system.

---

## Overview of Changes

### What Changed on Backend:

1. **Removed**: `POST /posts/:postId/prefer-foodtype` endpoint (explicit preference endpoint)
2. **New Behavior**: Preferences are now **automatically learned** from user interactions:
   - When user **likes** a post
   - When user **saves/bookmarks** a post
   - When user **comments** on a post
   - When user **views** a post detail (if `x-user-id` header is sent)
3. **Feed Algorithm Updated**: 
   - Prioritizes most recently interacted food type (50% of feed)
   - Shows 20% from other preferred types
   - 30% general content
   - Falls back to 70/30 split if no recent interaction

### What You Need to Change on Frontend:

1. **Remove**: "Prefer" button/UI element and its API call
2. **Update**: Interaction methods (like, save, comment) already work - no changes needed
3. **Update**: Post detail view to send `x-user-id` header for view tracking
4. **Remove**: Preference state management related to explicit "prefer" action
5. **Optional**: Update UI to reflect that preferences are learned automatically

---

## Step-by-Step Migration

### Step 1: Remove Explicit "Prefer" Button/UI Element

**Find and Remove**:
- Any "Prefer", "Add to Preferences", or similar button in your post cards/detail screens
- The composable/UI component that displays the prefer button
- Any visual indicator showing "preferred" state based on explicit user action

**Example - Remove this type of code:**
```kotlin
// ❌ REMOVE THIS
@Composable
fun PreferFoodTypeButton(
    post: Post,
    isPreferred: Boolean,
    onPreferClick: () -> Unit,
) {
    IconButton(onClick = onPreferClick) {
        Icon(
            imageVector = if (isPreferred) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
            contentDescription = "Prefer food type"
        )
    }
}

// ❌ REMOVE USAGE IN POST CARD
PreferFoodTypeButton(
    post = post,
    isPreferred = viewModel.isFoodTypePreferred(post.foodType),
    onPreferClick = { viewModel.preferFoodType(post._id) }
)
```

**Note**: You may want to keep visual indicators showing which food type a post has (like a chip/badge), but remove any "prefer" action button.

---

### Step 2: Remove API Service Method for PreferFoodType

**File**: Your API service/interface (e.g., `PostsApi.kt` or `ApiService.kt`)

**Remove this method:**
```kotlin
// ❌ REMOVE THIS
@POST("posts/{postId}/prefer-foodtype")
suspend fun preferFoodType(
    @Path("postId") postId: String,
    @Header("x-user-id") userId: String
): UserAccount
```

---

### Step 3: Remove ViewModel Methods Related to Explicit Preference

**File**: Your PostsViewModel or similar ViewModel

**Remove these methods/state:**
```kotlin
// ❌ REMOVE THESE IF THEY EXIST
fun preferFoodType(postId: String) { ... }
fun isFoodTypePreferred(foodType: String): Boolean { ... }

// ❌ REMOVE STATE RELATED TO EXPLICIT PREFERENCE
private val _preferringPostIds = MutableStateFlow<Set<String>>(emptySet())
val preferringPostIds: StateFlow<Set<String>> = _preferringPostIds
```

**Note**: Keep `preferredFoodTypes` state if you use it for other purposes (like displaying user preferences in settings), but remove methods that explicitly add preferences.

---

### Step 4: Update Post Detail View to Track Views

**File**: Post detail screen/composable

**Current Behavior**: When user opens post detail, make API call without `x-user-id` header

**New Behavior**: Include `x-user-id` header in the GET request to track the view

**Example - Update API call:**
```kotlin
// ✅ BEFORE (no header for view tracking)
@GET("posts/{postId}")
suspend fun getPostById(
    @Path("postId") postId: String
): Post

// ✅ AFTER (with optional header for view tracking)
@GET("posts/{postId}")
suspend fun getPostById(
    @Path("postId") postId: String,
    @Header("x-user-id") userId: String? = null  // Optional header
): Post
```

**In your ViewModel/Repository:**
```kotlin
// ✅ UPDATE YOUR METHOD
suspend fun getPostById(postId: String): Post {
    val userId = userRepository.getCurrentUserId() // Get current user ID
    return postsApi.getPostById(
        postId = postId,
        userId = userId  // Pass userId for view tracking
    )
}
```

**Note**: The backend will automatically track the view and update preferences. No additional action needed from your side.

---

### Step 5: Verify Existing Interactions Work (No Changes Needed)

**These interactions already work correctly** - preferences are tracked automatically:
- ✅ **Like**: When user likes a post, preference is learned automatically
- ✅ **Save**: When user saves a post, preference is learned automatically  
- ✅ **Comment**: When user comments on a post, preference is learned automatically
- ✅ **View**: Now tracks when user views post detail (after Step 4)

**No code changes needed** - your existing like/save/comment implementations already send the necessary data to the backend.

---

### Step 6: Update Feed Loading (Optional Enhancement)

**Current Behavior**: Feed loads with `GET /posts` endpoint

**New Behavior**: Feed automatically returns personalized content based on:
- Most recently interacted food type (50%)
- Other preferred food types (20%)
- General content (30%)

**No API changes needed** - just ensure you're sending `x-user-id` header:

```kotlin
// ✅ VERIFY YOUR FEED API CALL INCLUDES USER ID
@GET("posts")
suspend fun getPosts(
    @Header("x-user-id") userId: String? = null
): List<Post>

// In ViewModel
suspend fun loadFeed() {
    val userId = userRepository.getCurrentUserId()
    val posts = postsApi.getPosts(userId = userId)
    _posts.value = posts
}
```

**The backend handles all personalization logic** - you just receive the personalized feed.

---

### Step 7: Remove Preference State Management (If Applicable)

**If you were managing explicit preference state**, clean it up:

```kotlin
// ❌ REMOVE IF EXISTS
private val _userPreferences = MutableStateFlow<List<String>>(emptyList())
val userPreferences: StateFlow<List<String>> = _userPreferences.asStateFlow()

// ❌ REMOVE METHODS THAT UPDATE THIS STATE FROM EXPLICIT PREFERENCE ACTIONS
```

**Note**: If you fetch user preferences from another endpoint (like user profile), you can keep that. Only remove state related to explicit "prefer" button actions.

---

### Step 8: Update UI Messaging (Optional)

**Consider updating user-facing text** to reflect implicit learning:

**Before (Explicit)**:
- "Add to Preferences"
- "Prefer this food type"
- Button: "Prefer" / "Prefer ✓"

**After (Implicit)**:
- Remove these buttons entirely
- Optional: Add subtle indicator like "Preferences learned from your interactions" in settings
- Keep food type chips/badges for display purposes only (non-interactive)

---

## Complete Code Examples

### Example 1: Updated API Service

```kotlin
interface PostsApi {
    // ✅ Keep existing methods
    @GET("posts")
    suspend fun getPosts(
        @Header("x-user-id") userId: String? = null
    ): List<Post>
    
    @GET("posts/{postId}")
    suspend fun getPostById(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String? = null  // ✅ Add optional header
    ): Post
    
    @PATCH("posts/{postId}/like")
    suspend fun likePost(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String
    ): Post
    
    @PATCH("posts/{postId}/save")
    suspend fun savePost(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String
    ): Post
    
    @POST("posts/{postId}/comments")
    suspend fun createComment(
        @Path("postId") postId: String,
        @Header("x-user-id") userId: String,
        @Body comment: CreateCommentDto
    ): Comment
    
    // ❌ REMOVED: preferFoodType endpoint
}
```

### Example 2: Updated ViewModel

```kotlin
class PostsViewModel(
    private val postsRepository: PostsRepository,
    private val userRepository: UserRepository
) : ViewModel() {
    
    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    // ❌ REMOVED: preferredFoodTypes state (unless needed for other purposes)
    // ❌ REMOVED: preferFoodType() method
    // ❌ REMOVED: isFoodTypePreferred() method
    
    // ✅ KEEP: Existing interaction methods (they already work)
    fun likePost(postId: String) {
        viewModelScope.launch {
            try {
                val updatedPost = postsRepository.likePost(postId, getCurrentUserId())
                // Backend automatically updates preferences - no action needed
                updatePostInList(updatedPost)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun savePost(postId: String) {
        viewModelScope.launch {
            try {
                val updatedPost = postsRepository.savePost(postId, getCurrentUserId())
                // Backend automatically updates preferences - no action needed
                updatePostInList(updatedPost)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun commentOnPost(postId: String, text: String) {
        viewModelScope.launch {
            try {
                val comment = postsRepository.createComment(postId, getCurrentUserId(), text)
                // Backend automatically updates preferences - no action needed
                loadPost(postId) // Reload post to get updated comment count
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    // ✅ UPDATE: Post detail view to include userId
    fun loadPostDetail(postId: String) {
        viewModelScope.launch {
            try {
                val post = postsRepository.getPostById(postId, getCurrentUserId())
                // Backend automatically tracks view and updates preferences
                _selectedPost.value = post
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun loadFeed() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val userId = getCurrentUserId()
                val fetchedPosts = postsRepository.getPosts(userId)
                _posts.value = fetchedPosts
                // Feed is already personalized by backend (50/20/30 split)
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private fun getCurrentUserId(): String {
        return userRepository.getCurrentUserId() ?: throw IllegalStateException("User not logged in")
    }
}
```

### Example 3: Updated Post Card (Removed Prefer Button)

```kotlin
@Composable
fun PostCard(
    post: Post,
    viewModel: PostsViewModel,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column {
            // Post image
            AsyncImage(
                model = post.mediaUrls.firstOrNull(),
                contentDescription = post.caption,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            )
            
            // Post actions row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Like button
                    LikeButton(
                        post = post,
                        onLikeClick = { viewModel.likePost(post._id) }
                    )
                    
                    // Comment button
                    CommentButton(
                        post = post,
                        onCommentClick = { /* Navigate to comments */ }
                    )
                    
                    // Share button
                    ShareButton(
                        post = post,
                        onShareClick = { /* Share post */ }
                    )
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // ❌ REMOVED: PreferFoodTypeButton
                    
                    // Save button
                    SaveButton(
                        post = post,
                        onSaveClick = { viewModel.savePost(post._id) }
                    )
                }
            }
            
            // Post details
            Text(
                text = post.caption,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            
            // ✅ KEEP: Food type badge (display only, non-interactive)
            FoodTypeChip(foodType = post.foodType)
        }
    }
}
```

### Example 4: Updated Repository (Include userId in getPostById)

```kotlin
class PostsRepository(
    private val api: PostsApi
) {
    suspend fun getPosts(userId: String?): List<Post> {
        return api.getPosts(userId = userId)
    }
    
    suspend fun getPostById(postId: String, userId: String?): Post {
        return api.getPostById(postId = postId, userId = userId)
    }
    
    suspend fun likePost(postId: String, userId: String): Post {
        return api.likePost(postId, userId)
        // Backend handles preference update automatically
    }
    
    suspend fun savePost(postId: String, userId: String): Post {
        return api.savePost(postId, userId)
        // Backend handles preference update automatically
    }
    
    suspend fun createComment(postId: String, userId: String, text: String): Comment {
        return api.createComment(postId, userId, CreateCommentDto(text))
        // Backend handles preference update automatically
    }
    
    // ❌ REMOVED: preferFoodType method
}
```

---

## Migration Checklist

Use this checklist to ensure all changes are complete:

- [ ] **Removed** "Prefer" button/UI element from post cards
- [ ] **Removed** "Prefer" button from post detail screens
- [ ] **Removed** `preferFoodType()` API method from service interface
- [ ] **Removed** `preferFoodType()` method from ViewModel
- [ ] **Removed** `isFoodTypePreferred()` method (if it checked explicit preference)
- [ ] **Removed** state management for explicit preference actions
- [ ] **Updated** `getPostById()` API call to include optional `x-user-id` header
- [ ] **Updated** repository method to pass `userId` to `getPostById()`
- [ ] **Updated** ViewModel to pass `userId` when loading post detail
- [ ] **Verified** existing like/save/comment methods work (no changes needed)
- [ ] **Verified** feed loading includes `x-user-id` header
- [ ] **Tested** that preferences are learned from interactions
- [ ] **Tested** that feed shows personalized content
- [ ] **Updated** UI text/messaging (if applicable)

---

## Testing the Migration

### Test Case 1: Like Interaction
1. User likes a post with food type "Spicy"
2. **Expected**: Preference is automatically added, `lastInteractedFoodType` = "Spicy"
3. **Verify**: Next feed load shows more "Spicy" posts (50% priority)

### Test Case 2: Save Interaction
1. User saves a post with food type "Seafood"
2. **Expected**: Preference is automatically added, `lastInteractedFoodType` = "Seafood"
3. **Verify**: Next feed load prioritizes "Seafood" posts

### Test Case 3: Comment Interaction
1. User comments on a post with food type "Street food"
2. **Expected**: Preference is automatically added, `lastInteractedFoodType` = "Street food"
3. **Verify**: Feed updates accordingly

### Test Case 4: View Interaction
1. User opens post detail view (with `x-user-id` header sent)
2. **Expected**: Preference is automatically added for that post's food type
3. **Verify**: View is tracked and preferences updated

### Test Case 5: Feed Personalization
1. User has interacted with "Spicy" food type (most recent)
2. User has also interacted with "Seafood" and "Street food" previously
3. **Expected**: Feed shows:
   - 50% "Spicy" posts (lastInteractedFoodType)
   - 20% posts from "Seafood" or "Street food" (other preferred)
   - 30% general posts (not in preferred types)

---

## Important Notes

1. **No Breaking Changes**: Existing interaction endpoints (like, save, comment) work exactly the same - they just now also update preferences automatically.

2. **Backward Compatible**: If user has no preferences or no recent interaction, feed falls back to 70/30 split or general feed.

3. **Silent Operation**: Preference updates happen in the background and don't affect the user experience - interactions feel the same, just smarter.

4. **View Tracking**: Only tracks views when `x-user-id` header is sent. If not sent, view is not tracked (backward compatible).

5. **Performance**: Preference updates are non-blocking on backend, so they don't slow down interactions.

---

## Summary

The migration is straightforward:
- **Remove** explicit "prefer" UI and API calls
- **Update** post detail view to send `x-user-id` header
- **Keep** existing interaction methods (they already work)
- **Enjoy** automatic preference learning from user behavior

The backend now handles all preference logic automatically based on user interactions!

