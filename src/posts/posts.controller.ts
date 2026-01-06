// src/posts/posts.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Patch,
  Param,
  Delete,
  Get, // Make sure Get is imported
  Query, // Make sure Query is imported
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Types } from 'mongoose';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiTags,
  ApiQuery, // Make sure ApiQuery is imported
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostDocument, Post as PostSchema, FoodType } from './schemas/post.schema';
// import { MulterFile } from '../common/types/multer-file.type'; // Removed as Express.Multer.File is used directly
import { UploadResponseDto } from './dto/upload-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto'; // Ensure this is imported if used
import { Comment as CommentSchema } from './schemas/comment.schema'; // <-- Import CommentSchema for response types
import { SharePostDto } from './dto/share-post.dto';
import { FoodDetectionService } from '../common/services/food-detection.service';
import { FoodCategoryMatchingService } from '../common/services/food-category-matching.service';
import { ClarifaiFoodDetectionService } from '../common/services/clarifai-food-detection.service';
import { HuggingFaceFoodDetectionService } from '../common/services/huggingface-food-detection.service';


@ApiTags('posts')
@Controller('posts')
export class PostsController {
  /**
   * ⚠️ IMPORTANT: Food detection and category matching services are ONLY injected here.
   * These AI services are NOT used in other controllers (useraccount, professionalaccount, etc.).
   * This ensures AI validation is ONLY applied to post uploads, not profile pictures, licenses, etc.
   */
  constructor(
    private readonly postsService: PostsService,
    private readonly foodDetectionService: FoodDetectionService,
    private readonly foodCategoryMatchingService: FoodCategoryMatchingService,
    private readonly clarifaiService: ClarifaiFoodDetectionService,
    private readonly huggingFaceService: HuggingFaceFoodDetectionService,
  ) {}

  // --- 1. File Upload Endpoint ---
  @Post('uploads')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          minItems: 1,
        },
      },
      required: ['files'],
    },
  })
  @ApiOperation({ summary: 'Uploads one or more media files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully', type: UploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid file type or size)' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Accepted formats: images (jpg, jpeg, png, gif, webp, bmp, svg) and videos (mp4, mov, avi, wmv, webm, mkv, flv) and PDFs
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|bmp|svg\+xml|mp4|mov|avi|wmv|webm|mkv|flv|pdf)$/)) {
          return cb(new BadRequestException('Only image, video, and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 100 * 1024 * 1024 }, // ✅ CHANGED: 50MB → 100MB per file
    }),
  )
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<UploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded.');
    }
    return this.postsService.uploadFiles(files);
  }

  // --- 2. Create Post Endpoint ---
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully', type: PostSchema })
  @ApiResponse({ status: 400, description: 'Bad request (validation errors)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user creating the post (temporary, replaced by JWT later)',
    required: true,
    example: '60c72b2f9b1d8c001c8e4d1a',
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of account creating the post: "UserAccount" or "ProfessionalAccount" (temporary, replaced by JWT later)',
    required: true,
    example: 'UserAccount',
    enum: ['UserAccount', 'ProfessionalAccount']
  })
  create(
    @Headers('x-user-id') ownerId: string,
    @Headers('x-owner-type') ownerType: 'UserAccount' | 'ProfessionalAccount',
    @Body() createPostDto: CreatePostDto
  ) {
    if (!ownerId) {
      throw new BadRequestException('x-user-id header is required for creating a post.');
    }
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID format.');
    }
    if (!ownerType || (ownerType !== 'UserAccount' && ownerType !== 'ProfessionalAccount')) {
      throw new BadRequestException('x-owner-type header must be "UserAccount" or "ProfessionalAccount".');
    }

    return this.postsService.create(new Types.ObjectId(ownerId), ownerType, createPostDto);
  }

  // =======================================================================
  // --- GET ENDPOINTS (Ordered from most specific to most general) ---
  // =======================================================================

  // --- Get Reels Feed --- (More specific path segment)
  @Get('reels-feed')
  @ApiOperation({ summary: 'Get a paginated feed of reels' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of reels to return (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination (Base64 encoded "LAST_CREATED_AT_ISO_STRING_LAST_ID_STRING")',
    example: 'MjAyMy0xMC0yNlQxMjowMDowMC4wMDBaXzY1MzlmMzk0ODg2MTYwYmQ1MWUxZjIzYQ==',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of reels', type: [PostSchema] })
  async getReelsFeed(
    @Query('limit') limit: number = 10,
    @Query('cursor') cursor?: string,
  ) {
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('Limit must be between 1 and 50.');
    }
    return this.postsService.getReelsFeed(limit, cursor);
  }

  // --- Get Trending Posts --- (More specific path segment)
  @Get('trends') // The endpoint will be /posts/trends
  @ApiOperation({ summary: 'Retrieve a list of trending posts based on interactivity score' })
  @ApiResponse({ status: 200, description: 'List of trending posts', type: [PostSchema] })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid limit)' })
  async getTrendingPosts(
    @Query('limit') limit: string = '10' // Default limit as string
  ) {
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('Limit must be a positive number.');
    }

    return this.postsService.getTrendingPosts(parsedLimit);
  }

  // --- Get Posts by Owner ID --- (More specific path segment than :id)
  @Get('by-owner/:ownerId')
  @ApiOperation({ summary: 'Retrieve all posts by a specific owner (User or Professional)' })
  @ApiResponse({ status: 200, description: 'List of posts by the owner', type: [PostSchema] })
  @ApiResponse({ status: 400, description: 'Invalid owner ID format' })
  async findByOwnerId(@Param('ownerId') ownerId: string) {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID format.');
    }
    return this.postsService.findByOwnerId(new Types.ObjectId(ownerId));
  }

  // --- Get All Food Types --- (More specific path segment than :id)
  @Get('food-types')
  @ApiOperation({ 
    summary: 'Get all available food types',
    description: 'Returns an array of all available food types that can be used for filtering posts or creating new posts.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Array of food type strings',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Spicy', 'Healthy', 'Mashwi', 'Couscous', 'Street food', 'Fast food', 'Seafood', 'Fried', 'Desserts', 'Vegetarian-Friendly', 'Meat']
    }
  })
  async getAllFoodTypes(): Promise<string[]> {
    return this.postsService.getAllFoodTypes();
  }

  // --- Get Posts by Food Type --- (More specific path segment than :id)
  @Get('by-food-type/:foodType')
  @ApiOperation({ 
    summary: 'Retrieve all posts filtered by food type',
    description: 'Returns all posts that match the specified food type. Valid food types: BURGER, PIZZA, PASTA, MEXICAN, SUSHI, ASIAN, INDIAN, MIDEAST, SEAFOOD, CHICKEN, SANDWICHES, SOUPS, SALAD, VEGETARIAN, VEGAN, HEALTHY, GLUTEN_FREE, SPICY, BREAKFAST, DESSERT, DRINKS, KIDS_MENU, FAMILY_MEAL'
  })
  @ApiResponse({ status: 200, description: 'List of posts filtered by food type', type: [PostSchema] })
  @ApiResponse({ status: 400, description: 'Invalid food type' })
  async findByFoodType(@Param('foodType') foodType: string) {
    return this.postsService.findByFoodType(foodType);
  }

  // --- Get Saved Posts (for normal users only) --- (More specific path segment than :id)
  @Get('saved')
  @ApiOperation({ summary: 'Get all saved posts for a normal user' })
  @ApiResponse({ status: 200, description: 'List of saved posts with full details including comments', type: [PostSchema] })
  @ApiResponse({ status: 400, description: 'Bad request (invalid user ID)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) retrieving their saved posts',
    required: true,
  })
  async getSavedPosts(@Headers('x-user-id') userId: string): Promise<PostDocument[]> {
    if (!userId) {
      throw new BadRequestException('x-user-id header is required.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format.');
    }
    return this.postsService.getSavedPosts(new Types.ObjectId(userId));
  }

  // --- Get All Posts --- (General GET for the root path)
  @Get()
  @ApiOperation({ 
    summary: 'Retrieve all posts',
    description: 'Returns personalized feed (70% preferred, 30% general) if user is authenticated and has food preferences. Otherwise returns general feed.'
  })
  @ApiResponse({ status: 200, description: 'List of posts (personalized or general)', type: [PostSchema] })
  @ApiHeader({
    name: 'x-user-id',
    description: 'Optional: The ID of the normal user (UserAccount) for personalized feed',
    required: false,
  })
  async findAll(@Headers('x-user-id') userId?: string) {
    if (userId && Types.ObjectId.isValid(userId)) {
      return this.postsService.findAll(new Types.ObjectId(userId));
    }
    return this.postsService.findAll();
  }

  // --- Get a Single Post by ID --- (Most general GET with dynamic parameter)
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

  // =======================================================================
  // --- PATCH ENDPOINTS (Ordered from most specific to most general) ---
  // =======================================================================

  // --- Increment Reel View Count --- (More specific than :id)
  @Patch(':id/view/increment')
  @ApiOperation({ summary: 'Increment view count for a reel' })
  @ApiResponse({ status: 200, description: 'View count incremented', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Reel not found' })
  async incrementReelView(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reel ID format.');
    }
    // Correctly convert to ObjectId for service call
    return this.postsService.incrementReelView(new Types.ObjectId(id));
  }

  // --- Increment Like Count --- (More specific than :id)
@Patch(':id/like') // Use PATCH for idempotent actions like adding/removing an entry
  @ApiOperation({ summary: 'Add a like to a post by a normal user' })
  @ApiResponse({ status: 200, description: 'Like added', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'User already liked this post' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) performing the like',
    required: true,
  })
  async addLike(
    @Param('id') postId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.addLike(new Types.ObjectId(postId), new Types.ObjectId(userId));
  }

  // --- NEW: Remove Like ---
  @Delete(':id/like') // Use DELETE to remove a specific like entry
  @ApiOperation({ summary: 'Remove a like from a post by a normal user' })
  @ApiResponse({ status: 200, description: 'Like removed', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Post or like record not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) removing the like',
    required: true,
  })
  async removeLike(
    @Param('id') postId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.removeLike(new Types.ObjectId(postId), new Types.ObjectId(userId));
  }

  // --- NEW: Add Save ---
  @Patch(':id/save')
  @ApiOperation({ summary: 'Add a save (bookmark) to a post by a normal user' })
  @ApiResponse({ status: 200, description: 'Post saved', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'User already saved this post' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) performing the save',
    required: true,
  })
  async addSave(
    @Param('id') postId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.addSave(new Types.ObjectId(postId), new Types.ObjectId(userId));
  }

  // --- NEW: Remove Save ---
  @Delete(':id/save')
  @ApiOperation({ summary: 'Remove a save (bookmark) from a post by a normal user' })
  @ApiResponse({ status: 200, description: 'Save removed', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Post or save record not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) removing the save',
    required: true,
  })
  async removeSave(
    @Param('id') postId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.removeSave(new Types.ObjectId(postId), new Types.ObjectId(userId));
  }

  // --- Update a Post --- (Most general PATCH with dynamic parameter)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a post (only by its owner)' })
  @ApiResponse({ status: 200, description: 'Post updated successfully', type: PostSchema })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden: You are not authorized to update this post.' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user attempting to update the post (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of account attempting to update the post ("UserAccount" or "ProfessionalAccount") (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async update(
    @Param('id') id: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-owner-type') requesterType: 'UserAccount' | 'ProfessionalAccount',
    @Body() updatePostDto: UpdatePostDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!requesterId || !Types.ObjectId.isValid(requesterId)) {
      throw new BadRequestException('x-user-id header with a valid ObjectId is required.');
    }
    if (!requesterType || (requesterType !== 'UserAccount' && requesterType !== 'ProfessionalAccount')) {
      throw new BadRequestException('x-owner-type header must be "UserAccount" or "ProfessionalAccount".');
    }
    return this.postsService.update(new Types.ObjectId(id), new Types.ObjectId(requesterId), requesterType, updatePostDto);
  }


  // =======================================================================
  // --- DELETE ENDPOINTS (Ordered from most specific to most general) ---
  // =======================================================================

  // --- Delete a Comment --- (More specific than :id)
   @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: You are not authorized to delete this comment.' }) // <-- Added 403
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) attempting to delete the comment',
    required: true,
  })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Headers('x-user-id') userId: string, // <-- NEW: User ID for authorization
  ) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) { // <-- NEW: Validate userId
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.deleteComment(new Types.ObjectId(commentId), new Types.ObjectId(userId)); // <-- Pass userId
  }

  // --- Delete a Post --- (Most general DELETE with dynamic parameter)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post (only by its owner)' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully', type: PostSchema })
  @ApiResponse({ status: 403, description: 'Forbidden: You are not authorized to delete this post.' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user attempting to delete the post (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of account attempting to delete the post ("UserAccount" or "ProfessionalAccount") (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-owner-type') requesterType: 'UserAccount' | 'ProfessionalAccount',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!requesterId || !Types.ObjectId.isValid(requesterId)) {
      throw new BadRequestException('x-user-id header with a valid ObjectId is required.');
    }
    if (!requesterType || (requesterType !== 'UserAccount' && requesterType !== 'ProfessionalAccount')) {
      throw new BadRequestException('x-owner-type header must be "UserAccount" or "ProfessionalAccount".');
    }
    return this.postsService.remove(new Types.ObjectId(id), new Types.ObjectId(requesterId), requesterType);
  }


  // =======================================================================
  // --- POST ENDPOINTS (Other than root create) ---
  // =======================================================================

  // --- Add a Comment ---
   @Post(':postId/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: 201, description: 'Comment added successfully', type: CommentSchema }) // <-- Changed type
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the normal user (UserAccount) making the comment',
    required: true,
  })
  async createComment(
    @Param('postId') postId: string,
    @Headers('x-user-id') userId: string, // <-- NEW: User ID from header
    @Body() createCommentDto: CreateCommentDto
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!Types.ObjectId.isValid(userId)) { // <-- NEW: Validate userId
      throw new BadRequestException('Invalid user ID in x-user-id header.');
    }
    return this.postsService.createComment(new Types.ObjectId(postId), new Types.ObjectId(userId), createCommentDto); // <-- Pass userId
  }

  // --- Share a Post ---
  @Post(':id/share')
  @ApiOperation({ 
    summary: 'Share a post with another user via chat',
    description: 'Creates or uses an existing private conversation to share a post with a recipient user. The post is sent as a message with type "shared_post" containing the post image and data. The message includes three critical meta fields (sharedPostId, sharedPostCaption, sharedPostImage) that enable the frontend to display the post as an image card instead of text.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Post shared successfully. The message contains type="shared_post" with meta.sharedPostImage for display as an image card.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Post shared successfully' },
        data: {
          type: 'object',
          properties: {
            conversation: { 
              type: 'object',
              description: 'The conversation where the post was shared',
              properties: {
                id: { type: 'string' },
                participants: { type: 'array', items: { type: 'string' } }
              }
            },
            sharedMessage: { 
              type: 'object',
              description: 'The message with type "shared_post" and post data in meta',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', example: 'shared_post' },
                content: { type: 'string', description: 'Empty unless user provided custom message' },
                meta: {
                  type: 'object',
                  properties: {
                    sharedPostId: { type: 'string', description: 'The MongoDB _id of the shared post' },
                    sharedPostCaption: { type: 'string', description: 'The post caption text' },
                    sharedPostImage: { type: 'string', description: 'Relative path to image/thumbnail (e.g., uploads/posts/image.jpg)' },
                    isSharedPost: { type: 'boolean', example: true },
                    postId: { type: 'string' },
                    postPrimaryImageUrl: { type: 'string', description: 'Main image to display' },
                    postCaption: { type: 'string' },
                    postMediaType: { type: 'string' },
                    postOwner: { type: 'object' },
                    likeCount: { type: 'number' },
                    commentCount: { type: 'number' }
                  }
                }
              }
            },
            post: { type: 'object', description: 'Complete post details with primaryImageUrl' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Post not found or recipient not found' })
  @ApiResponse({ status: 400, description: 'Bad request (validation errors)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user sharing the post',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of account sharing the post: "UserAccount" or "ProfessionalAccount"',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount']
  })
  async sharePost(
    @Param('id') postId: string,
    @Headers('x-user-id') senderId: string,
    @Headers('x-owner-type') senderModel: 'UserAccount' | 'ProfessionalAccount',
    @Body() sharePostDto: SharePostDto,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    if (!senderId || !Types.ObjectId.isValid(senderId)) {
      throw new BadRequestException('x-user-id header with a valid ObjectId is required.');
    }
    if (!sharePostDto.recipientId || !Types.ObjectId.isValid(sharePostDto.recipientId)) {
      throw new BadRequestException('Invalid recipient ID format.');
    }
    if (!senderModel || (senderModel !== 'UserAccount' && senderModel !== 'ProfessionalAccount')) {
      throw new BadRequestException('x-owner-type header must be "UserAccount" or "ProfessionalAccount".');
    }

    return this.postsService.sharePost(
      new Types.ObjectId(postId),
      new Types.ObjectId(senderId),
      senderModel,
      new Types.ObjectId(sharePostDto.recipientId),
      sharePostDto.message,
    );
  }

  // =======================================================================
  // --- GET COMMENT ENDPOINTS ---
  // =======================================================================

  // --- Get all comments for a post ---
   @Get(':postId/comments')
  @ApiOperation({ summary: 'Get all comments for a post' })
  @ApiResponse({ status: 200, description: 'List of comments', type: [CommentSchema] }) // <-- Changed type
  async getComments(@Param('postId') postId: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    return this.postsService.getComments(new Types.ObjectId(postId)); // <-- Pass ObjectId
  }

  // =======================================================================
  // --- FOOD DETECTION TEST ENDPOINTS ---
  // =======================================================================

  // --- Test Food Detection Service Health ---
  @Get('test/food-detection/health')
  @ApiOperation({ 
    summary: 'Test food detection service health',
    description: 'Check if the food detection service is properly configured and available'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        foodDetection: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            available: { type: 'boolean' },
            credentialsConfigured: { type: 'boolean' }
          }
        },
        categoryMatching: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            available: { type: 'boolean' },
            credentialsConfigured: { type: 'boolean' }
          }
        }
      }
    }
  })
  async testFoodDetectionHealth() {
    const foodDetectionHealth = await this.foodDetectionService.healthCheck();
    const categoryMatchingHealth = await this.foodCategoryMatchingService.healthCheck();
    const clarifaiHealth = await this.clarifaiService.healthCheck();
    const huggingFaceHealth = await this.huggingFaceService.healthCheck();
    
    return {
      primary: {
        service: 'Clarifai API',
        status: clarifaiHealth.status,
        available: clarifaiHealth.available,
        apiKeyConfigured: clarifaiHealth.apiKeyConfigured,
        foodModel: clarifaiHealth.foodModel,
      },
      secondary: {
        service: 'Hugging Face Inference API',
        status: huggingFaceHealth.status,
        available: huggingFaceHealth.available,
        tokenConfigured: huggingFaceHealth.tokenConfigured,
        model: huggingFaceHealth.model,
      },
      fallback: {
        service: 'Google Cloud Vision API',
        status: foodDetectionHealth.status,
        available: foodDetectionHealth.available,
        credentialsConfigured: foodDetectionHealth.credentialsConfigured,
      },
      categoryMatching: categoryMatchingHealth,
      message: clarifaiHealth.available 
        ? 'Food detection services are ready! ✅ (Using Clarifai - Free & Reliable)' 
        : huggingFaceHealth.available
        ? 'Food detection services are ready! ✅ (Using Hugging Face - Free)'
        : 'Food detection in fallback mode. Add CLARIFAI_API_KEY or HUGGING_FACE_API_TOKEN to enable.',
    };
  }

  // --- Test Food Detection with Image URL ---
  @Post('test/food-detection/detect')
  @ApiOperation({ 
    summary: 'Test food detection on an image URL',
    description: 'Test if an image contains food-related content. Provide an image URL to test.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to test',
          example: 'https://example.com/food-image.jpg'
        }
      },
      required: ['imageUrl']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Food detection result',
    schema: {
      type: 'object',
      properties: {
        isFood: { type: 'boolean' },
        confidence: { type: 'number' },
        labels: { type: 'array' },
        detectionMethod: { type: 'string' }
      }
    }
  })
  async testFoodDetection(@Body() body: { imageUrl: string }) {
    if (!body.imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    
    return await this.foodDetectionService.detectFood(undefined, body.imageUrl);
  }

  // --- Test Category Matching with Image URL ---
  @Post('test/category-matching/match')
  @ApiOperation({ 
    summary: 'Test category matching on an image URL',
    description: 'Test if the AI-predicted category matches a user-selected category. Provide an image URL and food type to test.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to test',
          example: 'https://example.com/pizza-image.jpg'
        },
        foodType: {
          type: 'string',
          enum: Object.values(FoodType),
          description: 'The food category selected by the user',
          example: FoodType.PIZZA
        }
      },
      required: ['imageUrl', 'foodType']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category matching result',
    schema: {
      type: 'object',
      properties: {
        userSelectedCategory: { type: 'string' },
        aiPredictedCategories: { type: 'array' },
        matchStatus: { type: 'string', enum: ['MATCH', 'MISMATCH', 'UNCERTAIN'] },
        suggestedCategory: { type: 'string', nullable: true },
        confidence: { type: 'number' },
        detectionMethod: { type: 'string' }
      }
    }
  })
  async testCategoryMatching(@Body() body: { imageUrl: string; foodType: FoodType }) {
    if (!body.imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    if (!body.foodType || !Object.values(FoodType).includes(body.foodType)) {
      throw new BadRequestException('foodType must be a valid FoodType enum value');
    }
    
    return await this.foodCategoryMatchingService.matchCategory(
      body.foodType,
      undefined,
      body.imageUrl
    );
  }

  
}
