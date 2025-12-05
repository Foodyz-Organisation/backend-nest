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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Post as PostSchema } from './schemas/post.schema';
// import { MulterFile } from '../common/types/multer-file.type'; // Removed as Express.Multer.File is used directly
import { UploadResponseDto } from './dto/upload-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto'; // Ensure this is imported if used
import { Comment as CommentSchema } from './schemas/comment.schema'; // <-- Import CommentSchema for response types


@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          const timestamp = Date.now();
          cb(null, `${timestamp}-${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|mov|avi|wmv)$/)) {
          return cb(new BadRequestException('Only image and video files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
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

  // --- Get All Posts --- (General GET for the root path)
  @Get()
  @ApiOperation({ summary: 'Retrieve all posts' })
  @ApiResponse({ status: 200, description: 'List of all posts', type: [PostSchema] })
  async findAll() {
    return this.postsService.findAll();
  }

  // --- Get a Single Post by ID --- (Most general GET with dynamic parameter)
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single post by ID' })
  @ApiResponse({ status: 200, description: 'The post found', type: PostSchema })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID format.');
    }
    // No need to convert to ObjectId here as findOne in service accepts string
    return this.postsService.findOne(id);
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

  @Get('home-feed')
  @ApiOperation({ summary: 'Get a personalized home feed of posts from followed accounts' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of posts to return (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination (Base64 encoded "LAST_CREATED_AT_ISO_STRING_LAST_ID_STRING")',
    example: 'MjAyMy0xMC0yNlQxMjowMDowMC4wMDBaXzY1MzlmMzk0ODg2MTYwYmQ1MWUxZjIzYQ==',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of posts from followed accounts', type: [PostSchema] })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID or cursor)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user (UserAccount or ProfessionalAccount) requesting the home feed (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the user (UserAccount or ProfessionalAccount) requesting the home feed (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async getHomeFeed(
    @Headers('x-user-id') viewerId: string,
    @Headers('x-owner-type') viewerModel: 'UserAccount' | 'ProfessionalAccount',
    @Query('limit') limit: number = 10,
    @Query('cursor') cursor?: string,
  ): Promise<PostSchema[]> { // Assuming PostSchema can represent the output directly
    if (!Types.ObjectId.isValid(viewerId)) {
      throw new BadRequestException('x-user-id header with a valid ObjectId is required.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(viewerModel)) {
      throw new BadRequestException('x-owner-type header must be "UserAccount" or "ProfessionalAccount".');
    }
    if (limit < 1 || limit > 50) { // Example limit validation
      throw new BadRequestException('Limit must be between 1 and 50.');
    }
    return this.postsService.getHomeFeed(new Types.ObjectId(viewerId), viewerModel, limit, cursor);
  }

}
