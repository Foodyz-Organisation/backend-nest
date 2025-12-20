# Implicit Food Preference System - Implementation Prompt

Use this prompt to implement an implicit, recency-driven food preference system in this NestJS backend codebase.

---

## Current System State

The current system has:
- **Explicit preference endpoint**: `POST /posts/:postId/prefer-foodtype` (implemented in `src/posts/posts.controller.ts` and `src/posts/posts.service.ts`)
- **UserAccount schema** at `src/useraccount/schema/useraccount.schema.ts` with `preferredFoodTypes: FoodType[]` field
- **Feed personalization** in `src/posts/posts.service.ts` → `findAll()` method using 70/30 split (70% preferred, 30% general)
- **Interaction endpoints**:
  - `PATCH /posts/:id/like` → calls `postsService.addLike()`
  - `PATCH /posts/:id/save` → calls `postsService.addSave()`
  - `POST /posts/:postId/comments` → calls `postsService.createComment()`
  - `GET /posts/:id` → calls `postsService.findOne()`

---

## Implementation Requirements

### 1. Modify UserAccount Schema

**File**: `src/useraccount/schema/useraccount.schema.ts`

**Add these fields**:
```typescript
@Prop({ type: String, enum: FoodType, default: null, required: false })
lastInteractedFoodType?: FoodType | null;

@Prop({ type: Date, default: null, required: false })
lastInteractionTimestamp?: Date | null;
```

**Location**: Add after the `preferredFoodTypes` field (around line 86).

**Note**: The `FoodType` enum is imported from `'../../posts/schemas/post.schema'`.

---

### 2. Create InteractionService

**File**: Create new file `src/posts/interaction.service.ts`

**Create a new service** with the following structure:

```typescript
@Injectable()
export class InteractionService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(UserAccount.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async updateUserPreferenceFromInteraction(
    userId: Types.ObjectId,
    postId: Types.ObjectId,
  ): Promise<void> {
    // Implementation details below
  }
}
```

**Method Logic** (`updateUserPreferenceFromInteraction`):
1. Find the `Post` by `postId` using `this.postModel.findById(postId).exec()`
2. Extract `foodType` from the post
3. Find the `UserAccount` by `userId` using `this.userModel.findById(userId).exec()`
4. Initialize `preferredFoodTypes` array if null
5. Add the `foodType` to `preferredFoodTypes` array if not already present (implicit collection)
6. Update `lastInteractedFoodType` with the post's `foodType`
7. Update `lastInteractionTimestamp` with `new Date()`
8. Save the user account with `await user.save()`

**Error Handling**: 
- This method should be **non-blocking** - catch errors, log them, but don't throw exceptions
- Use `Logger` from `@nestjs/common` for logging
- Return void (not throw errors that would break the main interaction flow)

**Required Imports**:
- `Injectable, Logger` from `@nestjs/common`
- `InjectModel` from `@nestjs/mongoose`
- `Model, Types` from `mongoose`
- `Post, PostDocument` from `'./schemas/post.schema'`
- `UserAccount, UserDocument` from `'../useraccount/schema/useraccount.schema'`

---

### 3. Register InteractionService in PostsModule

**File**: `src/posts/posts.module.ts`

**Add to providers array**:
```typescript
providers: [PostsService, InteractionService],
```

**Add import**:
```typescript
import { InteractionService } from './interaction.service';
```

**Note**: The `UserAccount` model should already be registered in `MongooseModule.forFeature()` (check if it exists).

---

### 4. Inject InteractionService into PostsService

**File**: `src/posts/posts.service.ts`

**Add to constructor**:
```typescript
constructor(
  // ... existing injections ...
  private interactionService: InteractionService,
) {}
```

**Add import**:
```typescript
import { InteractionService } from './interaction.service';
```

---

### 5. Integrate Interaction Tracking

**File**: `src/posts/posts.service.ts`

Call `this.interactionService.updateUserPreferenceFromInteraction(userId, postId)` in the following methods:

#### A. In `addLike()` method (around line 478)

Add the call **after** `await post.save();` and **before** fetching the updated post:

```typescript
// After: await post.save();
this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
  (error) => {
    console.error('Failed to update preference from like interaction:', error);
  }
);
// Before: const updatedPost = await this.postModel.findById(postId).exec();
```

#### B. In `addSave()` method (around line 533)

Add the same pattern **after** `await post.save();`:

```typescript
// After: await post.save();
this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
  (error) => {
    console.error('Failed to update preference from save interaction:', error);
  }
);
```

#### C. In `createComment()` method (around line 619)

Add the same pattern **after** `await post.save();`:

```typescript
// After: await post.save();
this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
  (error) => {
    console.error('Failed to update preference from comment interaction:', error);
  }
);
```

**Note**: Use `.catch()` to handle errors without breaking the main flow.

#### D. Update `preferFoodType()` method (around line 250)

**Keep this method** (don't remove it), but also call the interaction service:

**Important**: The current method saves the user only if the foodType is not already present. Add the interaction service call **after the conditional save** and **before the return statement**:

```typescript
// Current code structure:
if (!user.preferredFoodTypes.includes(foodType as FoodType)) {
  user.preferredFoodTypes.push(foodType as FoodType);
  await user.save();
}

// Add this call AFTER the if block, before return
this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
  (error) => {
    console.error('Failed to update preference from explicit prefer action:', error);
  }
);

return user;
```

**Note**: The interaction service will handle updating `lastInteractedFoodType` and `lastInteractionTimestamp` regardless of whether the foodType was already in the array. This ensures explicit "prefer" actions always update recency tracking.

#### E. Add View Tracking to `findOne()` method (around line 185)

**Update method signature** to accept optional `userId`:
```typescript
async findOne(id: string, userId?: Types.ObjectId): Promise<PostDocument>
```

**Add tracking after finding the post** (before populating):
```typescript
const post = await this.postModel.findById(id).exec();
if (!post) {
  throw new NotFoundException(`Post with ID "${id}" not found.`);
}

// Add view tracking if userId is provided (non-blocking)
if (userId) {
  this.interactionService.updateUserPreferenceFromInteraction(userId, new Types.ObjectId(id)).catch(
    (error) => {
      console.error('Failed to update preference from view interaction:', error);
    }
  );
}

// Continue with existing population logic...
```

**Update Controller**: In `src/posts/posts.controller.ts`, update the `findOne()` endpoint (around line 290):

```typescript
@Get(':id')
@ApiOperation({ 
  summary: 'Retrieve a single post by ID',
  description: 'Returns a single post with all details. If x-user-id header is provided, the view is tracked for preference learning.'
})
@ApiResponse({ status: 200, description: 'The post found', type: PostSchema })
@ApiResponse({ status: 404, description: 'Post not found' })
@ApiHeader({
  name: 'x-user-id',
  description: 'Optional: The ID of the user viewing the post (for preference tracking)',
  required: false,
})
async findOne(
  @Param('id') id: string,
  @Headers('x-user-id') userId?: string,
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid post ID format.');
  }
  const userIdObject = userId && Types.ObjectId.isValid(userId) 
    ? new Types.ObjectId(userId) 
    : undefined;
  return this.postsService.findOne(id, userIdObject);
}
```

---

### 6. Update Feed Personalization Logic

**File**: `src/posts/posts.service.ts` → `findAll()` method (around line 129)

**Replace the existing logic** with the following prioritization:

```typescript
async findAll(userId?: Types.ObjectId): Promise<PostDocument[]> {
  let posts: PostDocument[] = [];
  const totalLimit = 50; // Total posts to return

  if (userId) {
    const user = await this.userModel.findById(userId).exec();
    
    if (user && user.preferredFoodTypes && user.preferredFoodTypes.length > 0) {
      // Check if user has a recent interaction (lastInteractedFoodType)
      if (user.lastInteractedFoodType) {
        // New prioritization: 50% lastInteractedFoodType, 20% other preferredFoodTypes, 30% general
        const lastInteractedLimit = Math.floor(totalLimit * 0.5); // 50% = 25 posts
        const otherPreferredLimit = Math.floor(totalLimit * 0.2); // 20% = 10 posts
        const generalLimit = totalLimit - lastInteractedLimit - otherPreferredLimit; // 30% = 15 posts

        // Get other preferred food types (excluding lastInteractedFoodType to avoid duplication)
        const otherPreferredFoodTypes = user.preferredFoodTypes.filter(
          (ft) => ft !== user.lastInteractedFoodType
        );

        // 1. Fetch posts matching lastInteractedFoodType (50%)
        const lastInteractedPosts = await this.postModel.find({
          foodType: user.lastInteractedFoodType,
        })
          .sort({ createdAt: -1 })
          .limit(lastInteractedLimit)
          .exec();

        // 2. Fetch posts from other preferredFoodTypes (20%) - only if there are other preferred types
        let otherPreferredPosts: PostDocument[] = [];
        if (otherPreferredFoodTypes.length > 0) {
          otherPreferredPosts = await this.postModel.find({
            foodType: { $in: otherPreferredFoodTypes },
          })
            .sort({ createdAt: -1 })
            .limit(otherPreferredLimit)
            .exec();
        }

        // 3. Fetch general posts (30%) - posts NOT in any preferredFoodTypes
        const allPreferredTypes = [...new Set([...user.preferredFoodTypes])]; // Ensure no duplicates
        const generalPosts = await this.postModel.find({
          foodType: { $nin: allPreferredTypes },
        })
          .sort({ createdAt: -1 })
          .limit(generalLimit)
          .exec();

        // Merge: lastInteracted first, then other preferred, then general
        posts = [...lastInteractedPosts, ...otherPreferredPosts, ...generalPosts];
      } else {
        // Fallback to old logic: 70% preferred, 30% general (when no recent interaction)
        const preferredLimit = Math.ceil(totalLimit * 0.7);
        const generalLimit = Math.floor(totalLimit * 0.3);

        const preferredPosts = await this.postModel.find({
          foodType: { $in: user.preferredFoodTypes }
        })
          .sort({ createdAt: -1 })
          .limit(preferredLimit)
          .exec();

        const generalPosts = await this.postModel.find({
          foodType: { $nin: user.preferredFoodTypes }
        })
          .sort({ createdAt: -1 })
          .limit(generalLimit)
          .exec();

        posts = [...preferredPosts, ...generalPosts];
      }
    } else {
      // User has no preferences, return general feed
      posts = await this.postModel.find()
        .sort({ createdAt: -1 })
        .limit(totalLimit)
        .exec();
    }
  } else {
    // No userId provided, return general feed
    posts = await this.postModel.find()
      .sort({ createdAt: -1 })
      .limit(totalLimit)
      .exec();
  }

  // Populate owner information for all posts (existing code)
  await Promise.all(posts.map(post => post.populate({
    path: 'ownerId',
    model: post.ownerModel,
    select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
  })));

  return posts as PostDocument[];
}
```

**Key Changes**:
- Check for `user.lastInteractedFoodType` first
- If present: 50% lastInteractedFoodType, 20% other preferred, 30% general
- If not present: Fall back to 70% preferred, 30% general (existing logic)
- All groups sorted by `createdAt: -1`
- Total limit maintained at 50 posts

---

## Summary of Changes

### Files to Modify:
1. ✅ `src/useraccount/schema/useraccount.schema.ts` - Add 2 new fields
2. ✅ `src/posts/interaction.service.ts` - **NEW FILE** - Create service
3. ✅ `src/posts/posts.module.ts` - Register InteractionService
4. ✅ `src/posts/posts.service.ts` - Inject service, integrate tracking, update findAll()
5. ✅ `src/posts/posts.controller.ts` - Update findOne() endpoint

### Methods to Update in PostsService:
- `addLike()` - Add interaction tracking call
- `addSave()` - Add interaction tracking call
- `createComment()` - Add interaction tracking call
- `preferFoodType()` - Add interaction tracking call (keep method)
- `findOne()` - Add userId parameter and view tracking
- `findAll()` - Update feed prioritization logic

### Keep Existing:
- `preferFoodType()` endpoint - Keep it, but also call interaction service
- All existing interaction endpoints remain unchanged in functionality

---

## Testing Checklist

After implementation, verify:
- [ ] UserAccount schema has new fields
- [ ] InteractionService is created and registered
- [ ] Liking a post updates `lastInteractedFoodType` and `preferredFoodTypes`
- [ ] Saving a post updates preferences
- [ ] Commenting on a post updates preferences
- [ ] Viewing a post (with x-user-id header) updates preferences
- [ ] Explicit `preferFoodType` also updates recency tracking
- [ ] Feed with `lastInteractedFoodType` shows 50/20/30 split
- [ ] Feed without `lastInteractedFoodType` falls back to 70/30 split
- [ ] All errors in InteractionService are caught and logged (non-blocking)

---

## Implementation Notes

- **Non-blocking design**: Interaction tracking failures should not break main operations
- **Backward compatibility**: Existing endpoints continue to work
- **Idempotent**: Calling interaction tracking multiple times is safe
- **Performance**: Tracking is asynchronous (fire-and-forget pattern)
- **Fallback logic**: Feed gracefully falls back if no recent interaction

---

**Please implement these changes step by step, ensuring each modification follows the existing code patterns and style in this NestJS codebase.**

