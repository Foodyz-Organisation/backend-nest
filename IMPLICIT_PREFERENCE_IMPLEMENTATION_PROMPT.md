# Implementation Prompt: Implicit Food Preference System with Recency-Driven Feed

Use this prompt to implement an implicit and recency-driven food preference system in this NestJS backend codebase.

## Current Codebase State

### Key Files:
- **Schema**: `src/useraccount/schema/useraccount.schema.ts` - Contains `preferredFoodTypes: FoodType[]` field (currently empty array by default)
- **Service**: `src/posts/posts.service.ts` - Contains `findAll()`, `addLike()`, `addSave()`, `createComment()`, `findOne()`, and `preferFoodType()` methods
- **Controller**: `src/posts/posts.controller.ts` - Contains endpoints for likes, saves, comments, and `POST /posts/:postId/prefer-foodtype`
- **Module**: `src/posts/posts.module.ts` - Registers PostsService and required Mongoose models
- **FoodType Enum**: `src/posts/schemas/post.schema.ts` - Defines available food types (Spicy, Healthy, Mashwi, etc.)

### Current Behavior:
- Users can explicitly prefer food types via `POST /posts/:postId/prefer-foodtype` endpoint
- Feed personalization uses 70% preferred types, 30% general content (in `findAll()` method)
- No automatic preference tracking from interactions (likes, comments, saves, views)

---

## Implementation Requirements

### 1. Update UserAccount Schema

**File**: `src/useraccount/schema/useraccount.schema.ts`

**Add these fields to the `UserAccount` class**:

```typescript
@Prop({ type: String, enum: FoodType, default: null, required: false })
lastInteractedFoodType?: FoodType | null;

@Prop({ type: Date, default: null, required: false })
lastInteractionTimestamp?: Date | null;
```

**Purpose**: Track the most recently interacted food type and timestamp for recency-based feed prioritization.

**Note**: Import `FoodType` from `'../../posts/schemas/post.schema'` if not already imported.

---

### 2. Create InteractionService

**New File**: `src/posts/interaction.service.ts`

**Create a new service** with the following structure:

```typescript
@Injectable()
export class InteractionService {
  // Inject Post and UserAccount models
  
  async updateUserPreferenceFromInteraction(
    userId: Types.ObjectId,
    postId: Types.ObjectId,
  ): Promise<void> {
    // Implementation details below
  }
}
```

**Method Logic** (`updateUserPreferenceFromInteraction`):
1. Find the `Post` by `postId` using `postModel.findById(postId)`
2. Extract the `foodType` from the found post
3. Find the `UserAccount` by `userId` using `userModel.findById(userId)`
4. **Add** the `foodType` to `user.preferredFoodTypes` array if not already present (implicit collection)
5. **Update** `user.lastInteractedFoodType` with the post's `foodType`
6. **Update** `user.lastInteractionTimestamp` with `new Date()`
7. Save the user account with `await user.save()`
8. Handle errors gracefully (log but don't throw) - this should be non-blocking for main interaction flows

**Error Handling**: Use try-catch to log errors but not throw exceptions, as this service should not break the main interaction flows (likes, comments, saves).

**Module Registration**: Add `InteractionService` to the `providers` array in `src/posts/posts.module.ts`

---

### 3. Integrate Interaction Tracking

**File**: `src/posts/posts.service.ts`

**Inject InteractionService** in the constructor:
```typescript
constructor(
  // ... existing injections
  private interactionService: InteractionService,
) {}
```

**Add calls to `updateUserPreferenceFromInteraction` in these methods** (call after the main operation succeeds, use `.catch()` to handle errors non-blocking):

1. **`addLike(postId, userId)` method**:
   - After successfully saving the like and updating post count
   - Add: `this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(err => console.error('Failed to update preference from like:', err));`

2. **`addSave(postId, userId)` method**:
   - After successfully saving the bookmark and updating post count
   - Add: `this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(err => console.error('Failed to update preference from save:', err));`

3. **`createComment(postId, userId, createCommentDto)` method**:
   - After successfully saving the comment and updating post count
   - Add: `this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(err => console.error('Failed to update preference from comment:', err));`

4. **`findOne(id)` method**:
   - Update method signature to accept optional `userId?: Types.ObjectId`
   - After fetching the post but before returning
   - Add: `if (userId) { this.interactionService.updateUserPreferenceFromInteraction(userId, new Types.ObjectId(id)).catch(err => console.error('Failed to update preference from view:', err)); }`

**Controller Update**: In `src/posts/posts.controller.ts`, update the `findOne` endpoint:
- Add optional `@Headers('x-user-id') userId?: string` parameter
- Validate and convert to ObjectId if provided
- Pass to service: `this.postsService.findOne(id, userId ? new Types.ObjectId(userId) : undefined)`

---

### 4. Update Feed Personalization Logic

**File**: `src/posts/posts.service.ts` - `findAll(userId?: Types.ObjectId)` method

**Replace the existing feed logic with the following**:

**New Algorithm**:
1. If `userId` is provided:
   - Fetch the user with `await this.userModel.findById(userId).exec()`
   
2. If user exists AND has `preferredFoodTypes` with length > 0:
   
   **Check if `lastInteractedFoodType` exists:**
   
   - **If `lastInteractedFoodType` is present**:
     - Calculate limits: 50% for `lastInteractedFoodType`, 20% for other preferred types, 30% for general
     - `lastInteractedLimit = Math.floor(totalLimit * 0.5)` (25 posts)
     - `otherPreferredLimit = Math.floor(totalLimit * 0.2)` (10 posts)
     - `generalLimit = totalLimit - lastInteractedLimit - otherPreferredLimit` (15 posts)
     
     - Fetch posts matching `lastInteractedFoodType` ONLY:
       ```typescript
       const lastInteractedPosts = await this.postModel.find({
         foodType: user.lastInteractedFoodType
       }).sort({ createdAt: -1 }).limit(lastInteractedLimit).exec();
       ```
     
     - Get other preferred types (excluding `lastInteractedFoodType`):
       ```typescript
       const otherPreferredTypes = user.preferredFoodTypes.filter(
         ft => ft !== user.lastInteractedFoodType
       );
       ```
     
     - Fetch posts from other preferred types (if any exist):
       ```typescript
       let otherPreferredPosts = [];
       if (otherPreferredTypes.length > 0) {
         otherPreferredPosts = await this.postModel.find({
           foodType: { $in: otherPreferredTypes }
         }).sort({ createdAt: -1 }).limit(otherPreferredLimit).exec();
       }
       ```
     
     - Fetch general posts (NOT in any preferredFoodTypes):
       ```typescript
       const generalPosts = await this.postModel.find({
         foodType: { $nin: user.preferredFoodTypes }
       }).sort({ createdAt: -1 }).limit(generalLimit).exec();
       ```
     
     - Merge: `posts = [...lastInteractedPosts, ...otherPreferredPosts, ...generalPosts]`
   
   - **If `lastInteractedFoodType` is NOT present** (fallback to old logic):
     - Use existing 70/30 split:
     - 70% from `preferredFoodTypes` (using `$in` operator)
     - 30% general (using `$nin` operator with `preferredFoodTypes`)

3. If user has no preferences or no userId:
   - Return general feed: `await this.postModel.find().sort({ createdAt: -1 }).limit(50).exec()`

**Important**: 
- `totalLimit = 50` (total posts to return)
- All queries should sort by `createdAt: -1` (newest first)
- After fetching posts, populate the `ownerId` field as in the existing code

---

### 5. Remove preferFoodType Endpoint

**Files to modify**:

1. **`src/posts/posts.service.ts`**:
   - **Remove** the `preferFoodType(postId, userId)` method entirely

2. **`src/posts/posts.controller.ts`**:
   - **Remove** the `@Post(':postId/prefer-foodtype')` endpoint
   - **Remove** the `preferFoodType()` controller method

**Rationale**: The explicit preference endpoint is replaced by implicit tracking from interactions.

---

## Summary of Changes

### Files to Create:
- ✅ `src/posts/interaction.service.ts` (NEW)

### Files to Modify:
1. ✅ `src/useraccount/schema/useraccount.schema.ts` - Add 2 new fields
2. ✅ `src/posts/posts.module.ts` - Add InteractionService to providers
3. ✅ `src/posts/posts.service.ts` - Inject InteractionService, add tracking calls, update `findAll()`, update `findOne()` signature, remove `preferFoodType()`
4. ✅ `src/posts/posts.controller.ts` - Update `findOne()` to accept optional userId header, remove `preferFoodType()` endpoint

---

## Testing Checklist

After implementation, verify:

1. ✅ UserAccount schema has new fields (check with database or schema file)
2. ✅ InteractionService is registered in PostsModule
3. ✅ Liking a post updates user preferences and `lastInteractedFoodType`
4. ✅ Saving a post updates user preferences and `lastInteractedFoodType`
5. ✅ Commenting on a post updates user preferences and `lastInteractedFoodType`
6. ✅ Viewing a post (with x-user-id header) updates user preferences and `lastInteractedFoodType`
7. ✅ Feed returns 50% lastInteractedFoodType, 20% other preferred, 30% general when `lastInteractedFoodType` exists
8. ✅ Feed falls back to 70/30 split when `lastInteractedFoodType` is null
9. ✅ `POST /posts/:postId/prefer-foodtype` endpoint is removed
10. ✅ No TypeScript compilation errors
11. ✅ No runtime errors when interactions occur

---

## Important Notes

- **Non-blocking**: Interaction tracking should never break the main interaction flows. Always use `.catch()` or try-catch to handle errors gracefully.
- **Idempotent**: Adding the same food type multiple times should not create duplicates in `preferredFoodTypes` array (use `includes()` check).
- **Backward Compatible**: Existing users without `lastInteractedFoodType` should fall back to 70/30 feed logic.
- **Performance**: The preference update is fire-and-forget (async, non-blocking) to maintain fast response times for interactions.

---

**Please implement this feature following the requirements above. Ensure proper error handling, TypeScript types, and adherence to NestJS best practices.**

