# Environment Variables Configuration

This document lists all required and optional environment variables for the application.

## Required Variables

### MongoDB Configuration
```env
MONGODB_URI=mongodb+srv://foodyz:foodyz@foodys.leceaaf.mongodb.net/?appName=foodys
```

### Supabase Storage Configuration
```env
SUPABASE_URL=https://bhfpudsrynnsxzazmcjd.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_vJb_tQFUhWVCNAGyJsSPaA_pFkx_U2I
SUPABASE_MEDIA_BUCKET_NAME=uploads
```

### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Google Gemini AI (Required for AI features)
```env
GEMINI_API_KEY=your-gemini-api-key
```

## Optional Variables

### Google Vision API (Optional - for enhanced image analysis)
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

### Stripe Payment (Optional - if using payment features)
```env
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
```

### Email Configuration (Optional - for email notifications)
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
```

### Server Configuration
```env
PORT=3000
```

### Loyalty Points Configuration (Optional)
```env
LOYALTY_POINTS_VALID_RECLAMATION=50
LOYALTY_POINTS_INVALID_RECLAMATION=-10
```

### Spam Detection (Optional)
```env
SPAM_API_URL=http://localhost:8000
```

### Bad Words Detection (Optional)
```env
BAD_WORDS_MODE=both
GRADIO_API_URL=http://127.0.0.1:7860
```

## Setup Instructions

1. Copy the example content above to a `.env` file in the root of your project
2. Replace all placeholder values with your actual credentials
3. Ensure `.env` is in `.gitignore` (it should already be there)
4. Never commit `.env` file to version control

## Notes

- The provided MongoDB and Supabase credentials are already configured for your project
- Change `JWT_SECRET` to a strong random string in production
- The `SUPABASE_SERVICE_KEY` is sensitive - keep it secret
- For production, use environment variables in your hosting platform (Render, etc.)

