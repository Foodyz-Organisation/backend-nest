# Render Deployment Guide

This guide will help you deploy your NestJS backend application to Render.com with MongoDB Atlas and Supabase Storage.

## Prerequisites

- A Render.com account
- MongoDB Atlas account and cluster
- Supabase account with a storage bucket created
- Git repository with your code

## Step 1: Prepare Your Repository

1. Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Verify that `.env` is in `.gitignore` (should not be committed)

## Step 2: Configure MongoDB Atlas

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (if you haven't already)
3. Create a database user
4. Whitelist Render's IP addresses (use `0.0.0.0/0` for all IPs, or add Render's IP ranges)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (if needed)

## Step 3: Configure Supabase Storage

1. Log in to [Supabase](https://supabase.com)
2. Create a new project or use an existing one
3. Go to Storage and create a bucket named `uploads` (or your preferred name)
4. Set the bucket to **Public** if you want public access to files
5. Get your Supabase credentials:
   - Go to Settings → API
   - Copy your **Project URL** (SUPABASE_URL)
   - Copy your **service_role key** (SUPABASE_SERVICE_KEY) - ⚠️ Keep this secret!

## Step 4: Create a Web Service on Render

1. Log in to [Render](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure the service:

### Basic Settings

- **Name**: `foodyz-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the closest region to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: (leave empty if root, or specify if in a subdirectory)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

### Environment Variables

Add the following environment variables in Render's dashboard:

```env
# MongoDB
MONGODB_URI=mongodb+srv://foodyz:foodyz@foodys.leceaaf.mongodb.net/?appName=foodys

# Supabase
SUPABASE_URL=https://bhfpudsrynnsxzazmcjd.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_vJb_tQFUhWVCNAGyJsSPaA_pFkx_U2I
SUPABASE_MEDIA_BUCKET_NAME=uploads

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google Gemini (if using AI features)
GEMINI_API_KEY=your-gemini-api-key

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key

# Email (if using email notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com

# Server
PORT=3000

# Optional: Loyalty Points
LOYALTY_POINTS_VALID_RECLAMATION=50
LOYALTY_POINTS_INVALID_RECLAMATION=-10
```

### Advanced Settings (Optional)

- **Health Check Path**: `/` or `/api`
- **Auto-Deploy**: `Yes` (to deploy on every push to main branch)

## Step 5: Create the Storage Bucket on Supabase (if not already created)

1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Click **New bucket**
4. Name it `uploads` (or match your SUPABASE_MEDIA_BUCKET_NAME)
5. Make it **Public** if you want files to be publicly accessible
6. Click **Create bucket**

## Step 6: Set Up CORS (if needed)

If you're accessing the API from a frontend application, you may need to configure CORS:

1. The application already has CORS enabled for all origins in `main.ts`
2. For production, consider restricting CORS to specific origins:
   - Update `src/main.ts` and change `origin: '*'` to `origin: ['https://yourdomain.com']`

## Step 7: Deploy

1. Click **Create Web Service**
2. Render will start building and deploying your application
3. Monitor the build logs for any errors
4. Once deployed, your service will be available at `https://your-service-name.onrender.com`

## Step 8: Verify Deployment

1. Check the service logs in Render dashboard
2. Visit `https://your-service-name.onrender.com/api` to see Swagger documentation
3. Test an API endpoint to ensure everything works

## Post-Deployment Checklist

- [ ] Verify MongoDB connection is working
- [ ] Test file upload to Supabase Storage
- [ ] Verify JWT authentication works
- [ ] Test API endpoints
- [ ] Check application logs for errors
- [ ] Update frontend application URLs to point to Render service

## Troubleshooting

### Build Fails

- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Application Crashes

- Check application logs in Render dashboard
- Verify all required environment variables are set
- Check MongoDB connection string is correct
- Verify Supabase credentials are correct

### Files Not Uploading

- Verify Supabase bucket exists and is accessible
- Check SUPABASE_SERVICE_KEY is correct (use service_role key, not anon key)
- Verify bucket name matches SUPABASE_MEDIA_BUCKET_NAME

### Database Connection Issues

- Verify MongoDB Atlas IP whitelist includes Render's IPs (or use 0.0.0.0/0)
- Check MongoDB connection string format
- Verify database user credentials

## Environment Variables Reference

See `.env.example` for a complete list of all environment variables and their descriptions.

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong JWT_SECRET** - Generate a random string for production
3. **Protect SUPABASE_SERVICE_KEY** - This key has admin access, keep it secret
4. **Restrict CORS** - In production, limit CORS to your frontend domain
5. **Use MongoDB Atlas IP Whitelisting** - Limit database access to known IPs when possible
6. **Enable Supabase RLS** - Use Row Level Security policies in Supabase for additional protection

## Monitoring

Render provides built-in monitoring:
- View logs in real-time
- Set up alerts for deployment failures
- Monitor service health and uptime

## Scaling

Render allows you to scale your service:
- Upgrade to a paid plan for better performance
- Add more instances for horizontal scaling
- Configure auto-scaling based on traffic

## Support

- Render Documentation: https://render.com/docs
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com
- Supabase Documentation: https://supabase.com/docs


