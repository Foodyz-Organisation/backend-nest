import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument, MediaType, FoodType } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UploadResponseDto } from './dto/upload-response.dto'; 
import { UpdatePostDto } from './dto/update-post.dto';
import ffmpeg from 'fluent-ffmpeg'; // <--- Change to this
import { Types, SortOrder } from 'mongoose'; // <--- Ensure SortOrder is imported here

import { join, extname, basename } from 'path'; // <--- Add path utilities for file handling
import { unlink, mkdir } from 'fs/promises'; // <--- Add for file deletion and directory creation
import { createWriteStream, existsSync, readFileSync } from 'fs'; // <--- Add for file writing, existence check, and reading
import { tmpdir } from 'os'; // <--- Add for temporary directory
import axios from 'axios'; // <--- Add for downloading files from URLs

import { Comment, CommentDocument } from './schemas/comment.schema'; // Import your Comment schema
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from 'src/professionalaccount/schema/professionalaccount.schema';
import { Save, SaveDocument } from './schemas/save.schema';
import { Like, LikeDocument } from './schemas/like.schema';
import { execSync } from 'child_process';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schema/notification.schema';
import { InteractionService } from './interaction.service';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { ChatManagementService } from '../chat-management/chat-management.service';
import { FoodDetectionService } from '../common/services/food-detection.service';
import { FoodCategoryMatchingService } from '../common/services/food-category-matching.service';

type MulterFile = Express.Multer.File;





@Injectable()
export class PostsService {
  getHomeFeed(arg0: Types.ObjectId, viewerModel: string, limit: number, cursor: string | undefined): Post[] | PromiseLike<Post[]> {
    throw new Error('Method not implemented.');
  }
    constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
    @InjectModel(UserAccount.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name) private readonly professionalModel: Model<ProfessionalDocument>, // <-- ADD THIS
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,   // <-- NEW
    @InjectModel(Save.name) private readonly saveModel: Model<SaveDocument>,
    private notificationService: NotificationService,
    private interactionService: InteractionService,
    private supabaseStorageService: SupabaseStorageService,
    private chatManagementService: ChatManagementService,
    private foodDetectionService: FoodDetectionService,
    private foodCategoryMatchingService: FoodCategoryMatchingService,
  ) {}

  /**
   * Creates a new post in the database.
   * @param createPostDto The data for the new post.
   * @returns The newly created post document.
   */

   async create(
    ownerId: Types.ObjectId,
    ownerModel: 'UserAccount' | 'ProfessionalAccount',
    createPostDto: CreatePostDto
  ): Promise<PostDocument> {
    const createdPost = new this.postModel({ ...createPostDto, ownerId, ownerModel });
    let savedPost = await createdPost.save();

    let populatedPost = await this.postModel.findById(savedPost._id)
      .populate({
        path: 'ownerId',
        model: ownerModel, // Mongoose uses this to know which collection to join
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl' // <-- Updated select fields
       })
      .exec();

    if (!populatedPost) {
        throw new Error('Failed to retrieve populated post after creation.');
    }

    // Your existing reel processing logic here
    if (savedPost.mediaType === MediaType.REEL && savedPost.mediaUrls.length > 0) {
      const videoUrl = savedPost.mediaUrls[0];
      
      try {
        const { thumbnailUrl, duration, aspectRatio } = await this._processVideoMetadataAndThumbnailFromUrl(videoUrl);

        savedPost.thumbnailUrl = thumbnailUrl;
        savedPost.duration = duration;
        savedPost.aspectRatio = aspectRatio;
        await savedPost.save();
      } catch (error) {
        console.error(`[ERROR] Failed to process reel metadata for Post ID ${savedPost._id}:`, error);
        if (error instanceof Error) {
            console.error('[ERROR STACK]', error.stack);
        }
        console.error('[ERROR TYPE]', typeof error);
        // Continue without failing the post creation - video processing is optional
      }
    }

    // Part 2: Food Category Matching - Validate user-selected category against AI prediction
    // This runs synchronously and includes results in the response
    let categoryValidation: any = null;
    
    if (savedPost.mediaUrls && savedPost.mediaUrls.length > 0) {
      const primaryImageUrl = savedPost.mediaUrls[0];
      
      try {
        // Run category matching synchronously (await instead of .then())
        const matchingResult = await this.foodCategoryMatchingService.matchCategory(
          savedPost.foodType,
          undefined,
          primaryImageUrl
        );
        
        // Log results for monitoring
        if (matchingResult.matchStatus === 'MISMATCH' && matchingResult.suggestedCategory) {
          console.warn(
            `[Food Category Matching] ⚠️ Post ${savedPost._id}: ` +
            `User selected "${savedPost.foodType}" but AI detected "${matchingResult.suggestedCategory}" ` +
            `(confidence: ${(matchingResult.confidence * 100).toFixed(1)}%)`
          );
        } else if (matchingResult.matchStatus === 'MATCH') {
          console.log(
            `[Food Category Matching] ✅ Post ${savedPost._id}: ` +
            `Category "${savedPost.foodType}" validated successfully ` +
            `(confidence: ${(matchingResult.confidence * 100).toFixed(1)}%)`
          );
        }
        
        // Format categoryValidation according to exact specification
        categoryValidation = {
          matchStatus: matchingResult.matchStatus, // "MATCH", "MISMATCH", or "UNCERTAIN"
          userSelectedCategory: matchingResult.userSelectedCategory,
          aiPredictedCategories: matchingResult.aiPredictedCategories.map(pred => ({
            category: pred.category,
            confidence: pred.confidence,
            matchedLabels: pred.matchedLabels,
          })),
          suggestedCategory: matchingResult.suggestedCategory,
          confidence: matchingResult.confidence,
          detectionMethod: matchingResult.detectionMethod,
        };
      } catch (error: any) {
        // Log error but don't fail post creation - return UNCERTAIN status
        console.warn(
          `[Food Category Matching] ⚠️ Failed to validate category for post ${savedPost._id}: ${error.message}`
        );
        
        // Return UNCERTAIN status if validation fails
        categoryValidation = {
          matchStatus: 'UNCERTAIN',
          userSelectedCategory: savedPost.foodType,
          aiPredictedCategories: [],
          suggestedCategory: null,
          confidence: 0.0,
          detectionMethod: 'fallback',
        };
      }
    } else {
      // No media URLs - return UNCERTAIN
      categoryValidation = {
        matchStatus: 'UNCERTAIN',
        userSelectedCategory: savedPost.foodType,
        aiPredictedCategories: [],
        suggestedCategory: null,
        confidence: 0.0,
        detectionMethod: 'fallback',
      };
    }
    
    // Create notification for post creation (notify followers)
    // Note: You can enhance this to fetch followers and notify them individually
    try {
      await this.notificationService.createPostNotification(
        NotificationType.POST_CREATED,
        savedPost._id.toString(),
        savedPost.caption,
        savedPost.ownerId.toString(),
        ownerModel,
        undefined, // recipientId - will be set per follower if you enhance this
        undefined, // recipientModel
        {
          postId: savedPost._id.toString(),
          postCaption: savedPost.caption,
          ownerId: savedPost.ownerId.toString(),
          ownerModel: ownerModel,
          mediaType: savedPost.mediaType,
          foodType: savedPost.foodType,
        },
      );
    } catch (notifError) {
      console.error('[ERROR] Failed to create post notification:', notifError);
      // Don't fail the post creation if notification fails
    }

    // Convert Mongoose document to plain object and add categoryValidation
    // Mongoose documents don't serialize custom properties, so we need to convert to object first
    const postObject = populatedPost.toObject ? populatedPost.toObject() : { ...populatedPost };
    const responseWithValidation = {
      ...postObject,
      categoryValidation: categoryValidation,
    };

    // Return as PostDocument (the categoryValidation will be included in JSON serialization)
    // Using 'any' cast because we're adding a custom field not in the schema
    return responseWithValidation as any as PostDocument;
  }

  async uploadFiles(files: MulterFile[]): Promise<UploadResponseDto> {
    // Part 1: Food Detection - Validate that all uploaded files contain food-related content
    for (const file of files) {
      // Only validate image files (skip videos for now, or extract frame for validation)
      if (file.mimetype.startsWith('image/')) {
        try {
          const foodDetectionResult = await this.foodDetectionService.detectFood(file.buffer);
          
          if (!foodDetectionResult.isFood) {
            throw new BadRequestException(
              `The uploaded image "${file.originalname}" does not appear to contain food-related content. ` +
              `Please upload images of food items only. ` +
              `(Confidence: ${(foodDetectionResult.confidence * 100).toFixed(1)}%)`
            );
          }

          // Log successful food detection (optional, for monitoring)
          console.log(
            `[Food Detection] ✅ Image "${file.originalname}" validated as food ` +
            `(confidence: ${(foodDetectionResult.confidence * 100).toFixed(1)}%)`
          );
        } catch (error: any) {
          // If it's already a BadRequestException (non-food detected), re-throw it
          if (error instanceof BadRequestException && error.message.includes('does not appear to contain food')) {
            throw error;
          }
          
          // Check if it's a billing error
          if (error?.code === 7 || error?.message?.includes('billing')) {
            console.warn(
              `[Food Detection] ⚠️ Billing not enabled for Google Cloud Vision API. ` +
              `Allowing upload (fallback mode). ` +
              `Please enable billing to activate food detection: ` +
              `https://console.developers.google.com/billing/enable?project=YOUR_PROJECT_ID`
            );
            // Allow upload in fallback mode
            continue;
          }
          
          // For other errors (e.g., API unavailable), log warning but allow upload
          // This provides graceful degradation
          console.warn(
            `[Food Detection] ⚠️ Could not validate food content for "${file.originalname}": ${error.message}. ` +
            `Allowing upload (fallback mode).`
          );
        }
      }
      // Note: For video files, we could extract a frame and validate it,
      // but for now we'll validate during post creation using the thumbnail
    }

    // Upload files to Supabase Storage in the 'posts' folder
    const urls = await this.supabaseStorageService.uploadFiles(files, 'posts');
    return { urls };
  }



  async findAll(userId?: Types.ObjectId): Promise<PostDocument[]> {
    let posts: PostDocument[] = [];
    const totalLimit = 50; // Total posts to return

    // If userId is provided, check for personalized feed
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

          // Fetch preferred posts (70%)
          const preferredPosts = await this.postModel.find({
            foodType: { $in: user.preferredFoodTypes },
          })
            .sort({ createdAt: -1 })
            .limit(preferredLimit)
            .exec();

          // Fetch general posts (30%) - posts NOT in preferredFoodTypes
          const generalPosts = await this.postModel.find({
            foodType: { $nin: user.preferredFoodTypes },
          })
            .sort({ createdAt: -1 })
            .limit(generalLimit)
            .exec();

          // Merge: preferred first, then general
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

    // Populate owner information for all posts
    await Promise.all(posts.map(post => post.populate({
      path: 'ownerId',
      model: post.ownerModel,
      select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    })));

    return posts as PostDocument[];
  }

async findOne(id: string, userId?: Types.ObjectId): Promise<PostDocument>  {
    // 1. Fetch the post and populate its owner
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    // Track view interaction if userId is provided (non-blocking)
    if (userId) {
      this.interactionService.updateUserPreferenceFromInteraction(userId, new Types.ObjectId(id)).catch(
        (error) => {
          console.error('Failed to update preference from view:', error);
        }
      );
    }

    await post.populate({
        path: 'ownerId',
        model: post.ownerModel,
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    });

    // 2. Fetch the comments for this post, which are already populated with their userId
    const comments = await this.getComments(new Types.ObjectId(id)); // getComments now expects ObjectId

     console.log(`[DEBUG FindOne] Fetched comments for post ${id}:`, comments);
    // 3. Attach the comments to the post object
    post.comments = comments;

    return post as PostDocument;
  }



    async findByOwnerId(ownerId: Types.ObjectId): Promise<PostDocument[]> {
    const posts = await this.postModel.find({ ownerId: ownerId })
      .sort({ createdAt: -1 })
      .exec();

    await Promise.all(posts.map(post => post.populate({
        path: 'ownerId',
        model: post.ownerModel, // <-- RE-INTRODUCED
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    })));

    return posts as PostDocument[];
  }

  async findByFoodType(foodType: string): Promise<PostDocument[]> {
    // Validate that the foodType is a valid enum value
    if (!Object.values(FoodType).includes(foodType as FoodType)) {
      throw new BadRequestException(
        `Invalid food type. Must be one of: ${Object.values(FoodType).join(', ')}`
      );
    }

    const posts = await this.postModel.find({ foodType: foodType })
      .sort({ createdAt: -1 })
      .exec();

    await Promise.all(posts.map(post => post.populate({
        path: 'ownerId',
        model: post.ownerModel,
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    })));

    return posts as PostDocument[];
  }

  async getAllFoodTypes(): Promise<string[]> {
    // Return all FoodType enum values as an array
    return Object.values(FoodType);
  }



async update(
    id: Types.ObjectId,
    requesterId: Types.ObjectId,
    requesterModel: 'UserAccount' | 'ProfessionalAccount',
    updatePostDto: UpdatePostDto
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(id);
    if (!post) {
        throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    if (!post.ownerId.equals(requesterId) || post.ownerModel !== requesterModel) {
        throw new ForbiddenException('You are not authorized to update this post.');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (updatePostDto.caption !== undefined) {
      updateData.caption = updatePostDto.caption;
    }
    
    if (updatePostDto.foodType !== undefined) {
      updateData.foodType = updatePostDto.foodType;
    }

    // Validate that at least one field is provided
    if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No valid fields provided for update. Only "caption" and "foodType" can be updated.');
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).exec();

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID "${id}" not found after update attempt.`);
    }
    
    // Populate the updated document
    await updatedPost.populate({
        path: 'ownerId',
        model: updatedPost.ownerModel,
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    });

    return updatedPost as PostDocument;
  }


  async remove(
    id: Types.ObjectId,
    requesterId: Types.ObjectId,
    requesterModel: 'UserAccount' | 'ProfessionalAccount'
  ): Promise<PostDocument> {
    const post = await this.postModel.findById(id);
    if (!post) {
        throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    if (!post.ownerId.equals(requesterId) || post.ownerModel !== requesterModel) {
        throw new ForbiddenException('You are not authorized to delete this post.');
    }

    const deletedPost = await this.postModel.findByIdAndDelete(id).exec(); // Exec without populate for now

    if (!deletedPost) {
      throw new NotFoundException(`Post with ID "${id}" not found after delete attempt.`);
    }

    // Now populate on the deleted document
    await deletedPost.populate({
        path: 'ownerId',
        model: deletedPost.ownerModel, // <-- RE-INTRODUCED
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    });

    return deletedPost as PostDocument;
  }


  /**
   * Downloads a file from URL to a temporary location
   */
  private async downloadFileFromUrl(url: string, outputPath: string): Promise<void> {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * Processes video metadata and generates thumbnail from Supabase URL
   * Downloads video temporarily, processes it, uploads thumbnail to Supabase, then cleans up
   */
  private async _processVideoMetadataAndThumbnailFromUrl(
    videoUrl: string,
  ): Promise<{ thumbnailUrl: string; duration: number; aspectRatio: string }> {
    console.log(`[DEBUG] _processVideoMetadataAndThumbnailFromUrl called with videoUrl: ${videoUrl}`);

    // Create temporary directory for processing
    const tempDir = join(tmpdir(), 'video-processing');
    await mkdir(tempDir, { recursive: true });

    // Generate unique temporary file names
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1e9).toString(16);
    const tempVideoPath = join(tempDir, `${timestamp}-${randomString}.mp4`);
    const tempThumbnailPath = join(tempDir, `${timestamp}-${randomString}-thumbnail.png`);

    try {
      // 1. Download video from Supabase URL to temporary location
      console.log(`[DEBUG] Downloading video from ${videoUrl} to ${tempVideoPath}`);
      await this.downloadFileFromUrl(videoUrl, tempVideoPath);

      // 2. Process video metadata and generate thumbnail
      const result = await new Promise<{ thumbnailUrl: string; duration: number; aspectRatio: string }>(
        (resolve, reject) => {
          // Get video metadata (duration, aspect ratio)
          ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
            if (err) {
              console.error(`[FFPROBE ERROR] for ${tempVideoPath}:`, err);
              return reject(new BadRequestException(`Failed to process video: ${err.message}`));
            }
            console.log(`[FFPROBE DEBUG] Metadata obtained for ${tempVideoPath}`);

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (!videoStream) {
              console.error(`[FFPROBE ERROR] No video stream found in ${tempVideoPath}`);
              return reject(new BadRequestException('No video stream found in the file.'));
            }

            const duration = videoStream.duration ? parseFloat(videoStream.duration.toString()) : 0;
            const width = videoStream.width;
            const height = videoStream.height;
            const aspectRatio = width && height ? `${width}:${height}` : 'unknown';

            console.log(`[DEBUG] Attempting to generate thumbnail at: ${tempThumbnailPath}`);
            ffmpeg(tempVideoPath)
              .frames(1)
              .seek('0:01')
              .size('320x?')
              .output(tempThumbnailPath)
              .on('end', async () => {
                try {
                  // 3. Upload thumbnail to Supabase
                  console.log(`[DEBUG] Thumbnail generated, uploading to Supabase...`);
                  const thumbnailBuffer = readFileSync(tempThumbnailPath);
                  
                  // Extract original filename from video URL to create thumbnail filename
                  const videoFilename = basename(new URL(videoUrl).pathname);
                  const filenameWithoutExt = basename(videoFilename, extname(videoFilename));
                  const thumbnailFilename = `${filenameWithoutExt}-thumbnail.png`;
                  
                  // Upload thumbnail to Supabase
                  const thumbnailUrl = await this.supabaseStorageService.uploadFile(
                    thumbnailBuffer,
                    'posts',
                    thumbnailFilename
                  );

                  console.log(`[DEBUG] Thumbnail uploaded to Supabase: ${thumbnailUrl}`);
                  resolve({ thumbnailUrl, duration, aspectRatio });
                } catch (uploadError) {
                  console.error(`[THUMBNAIL UPLOAD ERROR]:`, uploadError);
                  reject(new BadRequestException(`Failed to upload thumbnail: ${uploadError.message}`));
                }
              })
              .on('error', (thumbErr) => {
                console.error(`[THUMBNAIL ERROR] for ${tempVideoPath}:`, thumbErr);
                reject(new BadRequestException(`Failed to generate thumbnail: ${thumbErr.message}`));
              })
              .run();
          });
        }
      );

      return result;
    } finally {
      // 4. Clean up temporary files
      try {
        if (existsSync(tempVideoPath)) {
          await unlink(tempVideoPath);
          console.log(`[DEBUG] Cleaned up temporary video file: ${tempVideoPath}`);
        }
        if (existsSync(tempThumbnailPath)) {
          await unlink(tempThumbnailPath);
          console.log(`[DEBUG] Cleaned up temporary thumbnail file: ${tempThumbnailPath}`);
        }
      } catch (cleanupError) {
        console.warn(`[WARNING] Failed to clean up temporary files:`, cleanupError);
        // Don't throw - cleanup errors shouldn't fail the operation
      }
    }
  }


async getReelsFeed(
    limit: number,
    cursor?: string // Expected format: Base64 encoded string of "LAST_CREATED_AT_ISO_STRING_LAST_ID_STRING"
): Promise<PostDocument[]> {
    const query: any = { mediaType: MediaType.REEL };
    const sortOrder: { [key: string]: SortOrder } = { createdAt: -1, _id: -1 }; // Newest first

    if (cursor) {
        try {
            const decodedCursor = Buffer.from(cursor, 'base64').toString('utf8');
            const [lastCreatedAtStr, lastIdStr] = decodedCursor.split('_');

            if (!lastCreatedAtStr || !lastIdStr) {
                throw new BadRequestException('Invalid cursor format.');
            }

            const lastCreatedAt = new Date(lastCreatedAtStr);
            const lastId = new Types.ObjectId(lastIdStr);

            query.$or = [
                { createdAt: { $lt: lastCreatedAt } },
                { createdAt: lastCreatedAt, _id: { $lt: lastId } }
            ];
        } catch (error) {
            console.error(`[ReelsFeed Error] Cursor parsing failed:`, error);
            throw new BadRequestException('Invalid cursor provided.');
        }
    }

     const reels = await this.postModel
        .find(query)
        .sort(sortOrder)
        .limit(limit)
        .exec();

    await Promise.all(reels.map(post => post.populate({
        path: 'ownerId',
        model: post.ownerModel, // <-- RE-INTRODUCED
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber'
    })));

    return reels as PostDocument[];
}



  async incrementReelView(id: Types.ObjectId): Promise<PostDocument> {
    const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).exec(); // Exec without populate

    if (!updatedPost || updatedPost.mediaType !== MediaType.REEL) {
      throw new NotFoundException(`Reel with ID "${id}" not found or is not a reel.`);
    }

    await updatedPost.populate({
        path: 'ownerId',
        model: updatedPost.ownerModel, // <-- RE-INTRODUCED
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
    });

    return updatedPost as PostDocument;
  }

   // --- Methods for Likes ---
  async addLike(postId: Types.ObjectId, userId: Types.ObjectId): Promise<PostDocument> {
      const post = await this.postModel.findById(postId);
      if (!post) {
        throw new NotFoundException(`Post with ID "${postId}" not found.`);
      }

      const existingLike = await this.likeModel.findOne({ postId, userId });
      if (existingLike) {
        throw new ConflictException('User has already liked this post.');
      }

      await this.likeModel.create({ postId, userId });
      post.likeCount += 1;
      await post.save();

      // Update user preference from interaction (non-blocking)
      this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
        (error) => {
          console.error('Failed to update preference from like:', error);
        }
      );

     const updatedPost = await this.postModel.findById(postId).exec(); // Exec without populate

      if (!updatedPost) {
        throw new Error('Post not found after like operation.');
      }
      await updatedPost.populate({
          path: 'ownerId',
          model: updatedPost.ownerModel, // <-- RE-INTRODUCED
          select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
      });
      return updatedPost as PostDocument;
     }

 async removeLike(postId: Types.ObjectId, userId: Types.ObjectId): Promise<PostDocument> {
      const post = await this.postModel.findById(postId);
      if (!post) {
        throw new NotFoundException(`Post with ID "${postId}" not found.`);
      }

      const deletedLike = await this.likeModel.findOneAndDelete({ postId, userId });
      if (!deletedLike) {
        throw new NotFoundException('Like record not found for this user and post.');
      }

      post.likeCount = Math.max(0, post.likeCount - 1);
      await post.save();

       const updatedPost = await this.postModel.findById(postId).exec(); // Exec without populate

      if (!updatedPost) {
        throw new Error('Post not found after unlike operation.');
      }
      await updatedPost.populate({
          path: 'ownerId',
          model: updatedPost.ownerModel, // <-- RE-INTRODUCED
          select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
      });
      return updatedPost as PostDocument; // Assert type here
    }

    async addSave(postId: Types.ObjectId, userId: Types.ObjectId): Promise<PostDocument> {
      const post = await this.postModel.findById(postId);
      if (!post) {
        throw new NotFoundException('Post with ID "${postId}" not found.');
      }

      const existingSave = await this.saveModel.findOne({ postId, userId });
      if (existingSave) {
        throw new ConflictException('User has already saved this post.');
      }

      await this.saveModel.create({ postId, userId });
      post.saveCount += 1;
      await post.save();

      // Update user preference from interaction (non-blocking)
      this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
        (error) => {
          console.error('Failed to update preference from save:', error);
        }
      );

      const updatedPost = await this.postModel.findById(postId).exec(); // Exec without populate

      if (!updatedPost) {
        throw new Error('Post not found after save operation.');
      }
      await updatedPost.populate({
          path: 'ownerId',
          model: updatedPost.ownerModel, 
          select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
      });
      return updatedPost as PostDocument;  }

    async removeSave(postId: Types.ObjectId, userId: Types.ObjectId): Promise<PostDocument> {
      const post = await this.postModel.findById(postId);
      if (!post) {
        throw new NotFoundException(`Post with ID "${postId}" not found.`);
      }

      const deletedSave = await this.saveModel.findOneAndDelete({ postId, userId });
      if (!deletedSave) {
        throw new NotFoundException('Save record not found for this user and post.');
      }

      post.saveCount = Math.max(0, post.saveCount - 1);
      await post.save();

     const updatedPost = await this.postModel.findById(postId).exec(); // Exec without populate

      if (!updatedPost) {
        throw new Error('Post not found after unsave operation.');
      }
      await updatedPost.populate({
          path: 'ownerId',
          model: updatedPost.ownerModel, // <-- RE-INTRODUCED
          select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
      });
      return updatedPost as PostDocument;
     }

    async getSavedPosts(userId: Types.ObjectId): Promise<PostDocument[]> {
      // Step 1: Find all saves for the user
      const saves = await this.saveModel.find({ userId }).exec();
      
      if (saves.length === 0) {
        return [];
      }

      // Step 2: Extract post IDs from saves
      const postIds = saves.map(save => save.postId);

      // Step 3: Fetch all posts by their IDs
      const posts = await this.postModel.find({ _id: { $in: postIds } })
        .sort({ createdAt: -1 }) // Sort by newest first
        .exec();

      // Step 4: Populate ownerId for each post based on its ownerModel
      await Promise.all(posts.map(post => post.populate({
        path: 'ownerId',
        model: post.ownerModel, // Use the post's own ownerModel field
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
      })));

      // Step 5: Fetch and attach comments for each post
      await Promise.all(posts.map(async (post) => {
        const comments = await this.getComments(post._id as Types.ObjectId);
        post.comments = comments;
      }));

      return posts as PostDocument[];
    }

async createComment(
    postId: Types.ObjectId, // Now expects ObjectId from controller
    userId: Types.ObjectId, // <-- NEW: The ID of the user commenting
    createCommentDto: CreateCommentDto
  ): Promise<CommentDocument> {
    const post = await this.postModel.findById(postId); // post expects ObjectId as well
    if (!post) {
      throw new NotFoundException(`Post with ID "${postId}" not found.`);
    }

    const newComment = new this.commentModel({
      post: postId,
      userId: userId, // <-- NEW: Link comment to user
      text: createCommentDto.text,
    });
    const savedComment = await newComment.save();

    post.commentCount += 1;
    await post.save();

    // Update user preference from interaction (non-blocking)
    this.interactionService.updateUserPreferenceFromInteraction(userId, postId).catch(
      (error) => {
        console.error('Failed to update preference from comment:', error);
      }
    );

    // Populate the userId of the new comment before returning
    await savedComment.populate({
      path: 'userId',
      model: UserAccount.name, // The model name for UserAccount
      select: '_id username fullName profilePictureUrl followerCount followingCount' // Fields to populate
    });

    return savedComment as CommentDocument; // Assert type
  }


  async getComments(postId: Types.ObjectId): Promise<CommentDocument[]> { // Now expects ObjectId from controller
    const comments = await this.commentModel.find({ post: postId })
      .sort({ createdAt: 1 })
      .exec();

    // Populate the userId for all fetched comments
    await Promise.all(comments.map(comment => comment.populate({
      path: 'userId',
      model: UserAccount.name,
      select: '_id username fullName profilePictureUrl followerCount followingCount'
    })));

    return comments as CommentDocument[]; // Assert type
  }

  async deleteComment(commentId: Types.ObjectId, userId: Types.ObjectId): Promise<void> { // <-- NEW: userId for authorization
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found.`);
    }

    // Authorization: Only the user who created the comment can delete it
    if (!comment.userId.equals(userId)) {
      throw new ForbiddenException('You are not authorized to delete this comment.');
    }

    await this.commentModel.deleteOne({ _id: commentId });

    // Decrement comment count on the post
    const post = await this.postModel.findById(comment.post as Types.ObjectId); // Cast to ObjectId
    if (post) {
      post.commentCount = Math.max(0, post.commentCount - 1);
      await post.save();
    }
  }
 

    async getTrendingPosts(limit: number = 10): Promise<PostDocument[]> {
    // 1. Perform the aggregation to calculate scores, sort, and limit.
    //    Crucially, we project 'ownerId' and 'ownerModel' so they are available
    //    for hydration and population after the aggregation.
    const trendingPostsRaw = await this.postModel.aggregate([
        {
            $project: {
                _id: 1,
                ownerId: 1,       // <-- PROJECT ownerId INSTEAD OF userId
                ownerModel: 1,    // <-- PROJECT ownerModel
                caption: 1,
                mediaUrls: 1,
                mediaType: 1,
                likeCount: 1,
                commentCount: 1,
                saveCount: 1,
                viewsCount: 1,
                thumbnailUrl: 1,
                duration: 1,
                aspectRatio: 1,
                createdAt: 1,
                updatedAt: 1,
                // NOTE: Double-check if 'description', 'ingredients', 'postRating', 'reviewsCount'
                // are actually part of your Post schema. If not, remove them from this $project stage.
                // description: 1,
                // ingredients: 1,
                // postRating: 1,
                // reviewsCount: 1,
                interactivityScore: {
                    $add: ["$likeCount", "$commentCount", "$saveCount"]
                }
            }
        },
        // 2. Sort by the calculated score in descending order
        {
            $sort: { interactivityScore: -1, createdAt: -1 }
        },
        // 3. Limit the results
        {
            $limit: limit
        }
    ]).exec();

    // 4. Hydrate the raw aggregation results into Mongoose documents.
    //    This is crucial to then be able to use the .populate() method,
    //    as .populate() only works on Mongoose document instances.
    const trendingPosts = trendingPostsRaw.map(rawDoc => this.postModel.hydrate(rawDoc));

    // 5. Populate the ownerId field for each hydrated document.
    //    We iterate through each post and call populate on it, explicitly using
    //    the 'model' from 'post.ownerModel'.
    await Promise.all(trendingPosts.map(post =>
        post.populate({
            path: 'ownerId',
            model: post.ownerModel, // <-- RE-INTRODUCED: Explicitly use the document's own ownerModel field
            select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl',
        })
    ));

    return trendingPosts as PostDocument[]; // Assert type here
  }
  
  /**
   * Share a post with another user via chat
   * @param postId The ID of the post to share
   * @param senderId The ID of the user sharing the post
   * @param senderModel The model type of the sender (UserAccount or ProfessionalAccount)
   * @param recipientId The ID of the recipient user
   * @param message Optional message to accompany the shared post
   * @returns The conversation and message created
   */
  async sharePost(
    postId: Types.ObjectId,
    senderId: Types.ObjectId,
    senderModel: 'UserAccount' | 'ProfessionalAccount',
    recipientId: Types.ObjectId,
    message?: string,
  ) {
    // 1. Verify the post exists and get its ownerModel first
    const post = await this.postModel.findById(postId).exec();

    if (!post) {
      throw new NotFoundException(`Post with ID "${postId}" not found.`);
    }

    // 2. Now populate the owner based on the ownerModel
    await post.populate({
      path: 'ownerId',
      model: post.ownerModel,
      select: '_id username fullName profilePictureUrl email professionalData.fullName professionalData.profilePictureUrl'
    });

    // 3. Verify the recipient exists (check both UserAccount and ProfessionalAccount)
    const recipientUser = await this.userModel.findById(recipientId).exec();
    const recipientProfessional = !recipientUser 
      ? await this.professionalModel.findById(recipientId).exec()
      : null;

    if (!recipientUser && !recipientProfessional) {
      throw new NotFoundException(`Recipient with ID "${recipientId}" not found.`);
    }

    // 4. Create or get existing private conversation between sender and recipient
    const conversation = await this.chatManagementService.createConversation(
      {
        kind: 'private',
        participants: [recipientId.toString()],
        title: '',
        meta: {},
      },
      senderId.toString(),
    );

    // 5. Prepare the message content and metadata
    // Content is empty by default - frontend will display the post image instead
    // Only include custom message text if user provided one
    const messageContent = message || '';
    
    // Get sender name for notification
    const senderUser = senderModel === 'UserAccount' 
      ? await this.userModel.findById(senderId).lean()
      : null;
    const senderProfessional = !senderUser 
      ? await this.professionalModel.findById(senderId).lean()
      : null;
    const senderName = senderUser?.fullName || senderUser?.username || 
                      senderProfessional?.fullName || (senderProfessional as any)?.professionalData?.fullName || 'Someone';

    // Determine the primary image to display (for easy frontend access)
    const postPrimaryImageUrl = post.mediaType === 'reel' 
      ? post.thumbnailUrl || post.mediaUrls[0]  // For reels, use thumbnail
      : post.mediaUrls[0];  // For images, use first image

    // 6. Send the message with post data embedded in meta
    // The message type 'shared_post' tells frontend to render the post image card
    const sharedMessage = await this.chatManagementService.sendMessage({
      conversationId: (conversation._id as Types.ObjectId).toString(),
      senderId: senderId.toString(),
      content: messageContent,  // Empty unless user added custom text
      type: 'shared_post', // Special type to indicate this is a shared post
      meta: {
        // ⚠️ CRITICAL: THREE REQUIRED FIELDS FOR FRONTEND
        sharedPostId: post._id.toString(),
        sharedPostCaption: post.caption,
        sharedPostImage: postPrimaryImageUrl, // Relative path (e.g., "uploads/posts/image.jpg")
        
        // Additional metadata for enhanced functionality
        isSharedPost: true,
        
        // Shared by information
        sharedBy: {
          id: senderId.toString(),
          name: senderName,
          model: senderModel,
        },
        
        // Legacy field name support (for backwards compatibility)
        postId: post._id.toString(),
        postPrimaryImageUrl: postPrimaryImageUrl,
        postCaption: post.caption,
        
        // Complete post data
        postMediaUrls: post.mediaUrls,
        postMediaType: post.mediaType,
        postFoodType: post.foodType,
        postThumbnailUrl: post.thumbnailUrl,
        
        // Post owner information
        postOwner: {
          id: (post.ownerId as any)?._id?.toString() || (post.ownerId as Types.ObjectId)?.toString() || '',
          name: (post.ownerId as any)?.username || (post.ownerId as any)?.fullName || (post.ownerId as any)?.professionalData?.fullName || 'Unknown',
          avatarUrl: (post.ownerId as any)?.profilePictureUrl || (post.ownerId as any)?.professionalData?.profilePictureUrl || '',
        },
        
        // Post details
        price: post.price,
        preparationTime: post.preparationTime,
        
        // Engagement stats
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        saveCount: post.saveCount,
        viewsCount: post.viewsCount,
        
        // Timestamps
        postCreatedAt: post.createdAt,
        sharedAt: new Date(),
      },
    });

    // 7. Create notification for the recipient
    try {
      const recipientModel = recipientUser ? 'UserAccount' : 'ProfessionalAccount';
      await this.notificationService.createChatNotification(
        NotificationType.MESSAGE_RECEIVED,
        (sharedMessage._id as Types.ObjectId).toString(),
        (conversation._id as Types.ObjectId).toString(),
        senderId.toString(),
        senderName,
        recipientId.toString(),
        recipientModel,
        `${senderName} shared a post with you`,
        {
          messageId: (sharedMessage._id as Types.ObjectId).toString(),
          conversationId: (conversation._id as Types.ObjectId).toString(),
          senderId: senderId.toString(),
          postId: post._id.toString(),
          isSharedPost: true,
        },
      );
    } catch (notifError) {
      console.error('Error creating share notification:', notifError);
      // Don't fail the sharing if notification fails
    }

    return {
      success: true,
      message: 'Post shared successfully',
      data: {
        conversation: {
          id: (conversation._id as Types.ObjectId).toString(),
          participants: conversation.participants.map(p => p.toString()),
        },
        sharedMessage: {
          id: (sharedMessage._id as Types.ObjectId).toString(),
          type: 'shared_post',
          content: messageContent,
          meta: sharedMessage.meta,
          createdAt: sharedMessage.createdAt,
        },
        post: {
          id: post._id.toString(),
          caption: post.caption,
          mediaUrls: post.mediaUrls,
          primaryImageUrl: postPrimaryImageUrl,
          mediaType: post.mediaType,
          foodType: post.foodType,
          thumbnailUrl: post.thumbnailUrl,
          owner: {
            id: (post.ownerId as any)?._id?.toString() || (post.ownerId as Types.ObjectId)?.toString() || '',
            name: (post.ownerId as any)?.username || (post.ownerId as any)?.fullName || (post.ownerId as any)?.professionalData?.fullName || 'Unknown',
          },
          price: post.price,
          preparationTime: post.preparationTime,
          stats: {
            likes: post.likeCount,
            comments: post.commentCount,
            saves: post.saveCount,
            views: post.viewsCount,
          },
        },
      },
    };
  }
  
  
}
