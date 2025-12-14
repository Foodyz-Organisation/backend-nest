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
import { unlink } from 'fs/promises'; // <--- Add for file deletion (optional, but good for cleanup)

import { Comment, CommentDocument } from './schemas/comment.schema'; // Import your Comment schema
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from 'src/professionalaccount/schema/professionalaccount.schema';
import { Save, SaveDocument } from './schemas/save.schema';
import { Like, LikeDocument } from './schemas/like.schema';
import { execSync } from 'child_process';

type MulterFile = Express.Multer.File;


let ffprobePath: string;
try {
  ffprobePath = execSync('which ffprobe', { encoding: 'utf-8' }).trim();
  ffmpeg.setFfprobePath(ffprobePath);
  console.log(`✅ FFprobe found at: ${ffprobePath}`);
} catch (error) {
  console.error('❌ FFprobe not found in PATH');
  // Fallback to common locations
  ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe'); // macOS Homebrew
}

// Same for ffmpeg
let ffmpegPath: string;
try {
  ffmpegPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log(`✅ FFmpeg found at: ${ffmpegPath}`);
} catch (error) {
  console.error('❌ FFmpeg not found in PATH');
  ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg'); // macOS Homebrew
}
// ===== End FFmpeg Configuration =====


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
      const filename = savedPost.mediaUrls[0].substring(savedPost.mediaUrls[0].lastIndexOf('/') + 1);
      const uploadDir = join(process.cwd(), 'uploads');
      const localFilePath = join(uploadDir, filename);

      try {
        const { thumbnailUrl, duration, aspectRatio } = await this._processVideoMetadataAndThumbnail(localFilePath);

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
      }
    }
    return populatedPost as PostDocument; // Assert type here
  }

  async uploadFiles(files: MulterFile[]): Promise<UploadResponseDto> {
    const baseUrl = 'http://10.0.2.2:3000'; // Or your host machine's IP for physical device
    const urls = files.map(file => `${baseUrl}/uploads/${file.filename}`);
    return { urls };
  }



  async findAll(userId?: Types.ObjectId): Promise<PostDocument[]> {
    let posts: PostDocument[] = [];

    // If userId is provided, check for personalized feed
    if (userId) {
      const user = await this.userModel.findById(userId).exec();
      
      if (user && user.preferredFoodTypes && user.preferredFoodTypes.length > 0) {
        // Personalized feed: 70% preferred, 30% general
        const totalLimit = 50; // Total posts to return
        const preferredLimit = Math.ceil(totalLimit * 0.7);
        const generalLimit = Math.floor(totalLimit * 0.3);

        // Fetch preferred posts (70%)
        const preferredPosts = await this.postModel.find({
          foodType: { $in: user.preferredFoodTypes }
        })
          .sort({ createdAt: -1 })
          .limit(preferredLimit)
          .exec();

        // Fetch general posts (30%) - posts NOT in preferredFoodTypes
        const generalPosts = await this.postModel.find({
          foodType: { $nin: user.preferredFoodTypes }
        })
          .sort({ createdAt: -1 })
          .limit(generalLimit)
          .exec();

        // Merge: preferred first, then general
        posts = [...preferredPosts, ...generalPosts];
      } else {
        // User has no preferences, return general feed
        posts = await this.postModel.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .exec();
      }
    } else {
      // No userId provided, return general feed
      posts = await this.postModel.find()
        .sort({ createdAt: -1 })
        .limit(50)
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

async findOne(id: string): Promise<PostDocument>  {
    // 1. Fetch the post and populate its owner
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
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

  async preferFoodType(postId: Types.ObjectId, userId: Types.ObjectId): Promise<UserDocument> {
    // 1. Find the post by postId
    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException(`Post with ID "${postId}" not found.`);
    }

    // 2. Extract the foodType from the found post
    const foodType = post.foodType;
    if (!foodType) {
      throw new BadRequestException('Post does not have a food type.');
    }

    // 3. Find the UserAccount by userId
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    // 4. Check if the post's foodType is already in the user's preferredFoodTypes array
    if (!user.preferredFoodTypes) {
      user.preferredFoodTypes = [];
    }

    // 5. If not present, add the foodType to the user's preferredFoodTypes array
    if (!user.preferredFoodTypes.includes(foodType as FoodType)) {
      user.preferredFoodTypes.push(foodType as FoodType);
      await user.save();
    }

    // 6. Return the updated UserAccount
    return user;
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

    if (updatePostDto.caption === undefined) {
        throw new BadRequestException('No valid fields provided for update. Only "caption" can be updated.');
    }

     const updatedPost = await this.postModel.findByIdAndUpdate(
      id,
      { caption: updatePostDto.caption },
      { new: true, runValidators: true },
    ).exec(); // Exec without populate for now

    if (!updatedPost) {
      throw new NotFoundException(`Post with ID "${id}" not found after update attempt.`);
    }
    
    // Now populate on the updated document
    await updatedPost.populate({
        path: 'ownerId',
        model: updatedPost.ownerModel, // <-- RE-INTRODUCED
        select: '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.licenseNumber professionalData.profilePictureUrl'
    });

    return updatedPost as PostDocument; // Added as PostDocument
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


   private async _processVideoMetadataAndThumbnail(
    localFilePath: string,
  ): Promise<{ thumbnailUrl: string; duration: number; aspectRatio: string }> {
    console.log(`[DEBUG] _processVideoMetadataAndThumbnail called with localFilePath: ${localFilePath}`);

    return new Promise((resolve, reject) => {
      // 1. Get video metadata (duration, aspect ratio)
      ffmpeg.ffprobe(localFilePath, (err, metadata) => {
        if (err) {
          console.error(`[FFPROBE ERROR] for ${localFilePath}:`, err);
          return reject(new BadRequestException(`Failed to process video: ${err.message}`));
        }
        console.log(`[FFPROBE DEBUG] Metadata obtained for ${localFilePath}`);


        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          console.error(`[FFPROBE ERROR] No video stream found in ${localFilePath}`);
          return reject(new BadRequestException('No video stream found in the file.'));
        }

        const duration = videoStream.duration ? parseFloat(videoStream.duration.toString()) : 0;
        const width = videoStream.width;
        const height = videoStream.height;
        const aspectRatio = width && height ? `${width}:${height}` : 'unknown';

        const uploadDir = join(process.cwd(), 'uploads'); // Ensure this is also absolute
        const filenameWithoutExt = basename(localFilePath, extname(localFilePath));
        const thumbnailFileName = `${filenameWithoutExt}-thumbnail.png`;
        const thumbnailPath = join(uploadDir, thumbnailFileName);

        // Ensure the directory for thumbnail exists (Multer should handle 'uploads', but good to be explicit for sub-dirs if any)
        // You might need 'fs.mkdirSync(uploadDir, { recursive: true });' if 'uploads' might not exist

        console.log(`[DEBUG] Attempting to generate thumbnail at: ${thumbnailPath}`);
        ffmpeg(localFilePath)
          .frames(1)
          .seek('0:01')
          .size('320x?')
          .output(thumbnailPath)
          .on('end', async () => {
            const thumbnailUrl = `http://10.0.2.2:3000/uploads/${thumbnailFileName}`; // Adjust baseUrl if needed
            console.log(`[DEBUG] Thumbnail generated: ${thumbnailUrl}`);
            resolve({ thumbnailUrl, duration, aspectRatio });
          })
          .on('error', (thumbErr) => {
            console.error(`[THUMBNAIL ERROR] for ${localFilePath}:`, thumbErr);
            reject(new BadRequestException(`Failed to generate thumbnail: ${thumbErr.message}`));
          })
          .run();
      });
    });
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
  
  
}
