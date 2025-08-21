# Vercel Deployment Guide

This guide walks you through deploying the Pipeline Job Board application to Vercel.

## Overview

The application is deployed as:
- **Frontend**: React app served by Vercel
- **Backend**: Express routes converted to Vercel Functions in `/api` directory
- **Database**: Supabase (already configured)
- **External Services**: Google OAuth, AWS Bedrock for LLM

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Google Cloud Console**: Access to update OAuth settings
4. **AWS Account**: For Bedrock LLM functionality

## Step 1: Prepare for Deployment

### 1.1 Commit Your Code
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Update Google OAuth Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Add your Vercel domain to "Authorized JavaScript origins":
   - `https://your-app-name.vercel.app`
5. Add to "Authorized redirect URIs":
   - `https://your-app-name.vercel.app` (for Supabase auth)

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub Repository
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Choose the repository containing your job board app

### 2.2 Configure Build Settings
Vercel should auto-detect:
- **Framework Preset**: Create React App
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build`
- **Output Directory**: `build`

### 2.3 Set Environment Variables
In Vercel project settings, add these environment variables:

**Required for Frontend:**
```
REACT_APP_SUPABASE_URL=https://uquggvdhfoodkbytgyhr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdWdndmRoZm9vZGtieXRneWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyOTI3MzMsImV4cCI6MjA3MDg2ODczM30.pNsHF3lLpoltaTznNgFYA02EaHtm6B_0Q14rRJZ1nhg
```

**Required for Backend API Functions:**
```
NODE_ENV=production
SUPABASE_URL=https://uquggvdhfoodkbytgyhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdWdndmRoZm9vZGtieXRneWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI5MjczMywiZXhwIjoyMDcwODY4NzMzfQ.ebnIIyZvtEpA3fmNpzSCBrCOwygzorFtniRXH7Vqi74
GOOGLE_CLIENT_ID=425689827554-8ku550l2bpup337o1gcbeilna2kdk06r.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA4ZPZVAOFAOGOV5B3
AWS_SECRET_ACCESS_KEY=OZA61shZVzY0Kx9btBNxI821fYYn8tdYMC9bhgn2
FRONTEND_URL=https://your-app-name.vercel.app
JWT_SECRET=your-super-secure-jwt-secret-here
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. You'll get a URL like `https://your-app-name.vercel.app`

## Step 3: Update Supabase Settings

### 3.1 Update Authentication Settings
1. Go to your Supabase dashboard
2. Navigate to "Authentication" > "URL Configuration"
3. Add your Vercel domain to "Site URL":
   - `https://your-app-name.vercel.app`
4. Add to "Redirect URLs":
   - `https://your-app-name.vercel.app/**`

### 3.2 Update Google OAuth in Supabase
1. In Supabase, go to "Authentication" > "Providers"
2. Configure Google provider with your production client ID/secret
3. Update redirect URL to your Vercel domain

## Step 4: Test Your Deployment

### 4.1 Basic Functionality
1. Visit your Vercel URL
2. Test Google authentication
3. Verify job board loads properly
4. Test drag and drop functionality

### 4.2 API Endpoints
Test these endpoints:
- `https://your-app-name.vercel.app/api/health`
- `https://your-app-name.vercel.app/api/jobs` (requires auth)

### 4.3 Email Sync
1. Sign in with Google
2. Enable email sync
3. Click "Sync Emails" button
4. Verify emails are processed

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain
1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Update DNS records as instructed

### 5.2 Update All URLs
Update these services with your custom domain:
- Google OAuth redirect URIs
- Supabase authentication URLs
- Environment variables (FRONTEND_URL)

## Troubleshooting

### Common Issues

**1. Build Fails**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify package.json dependencies

**2. API Functions Not Working**
- Check function logs in Vercel dashboard
- Verify environment variables for backend
- Ensure CORS is properly configured

**3. Authentication Issues**
- Verify Google OAuth settings
- Check Supabase authentication configuration
- Ensure redirect URLs match exactly

**4. Email Sync Fails**
- Verify Google OAuth scopes include Gmail access
- Check AWS credentials and permissions
- Review function logs for specific errors

### Debugging Steps

1. **Check Vercel Function Logs**:
   - Go to Vercel dashboard > Functions tab
   - View real-time logs for API calls

2. **Monitor Performance**:
   - Vercel dashboard shows function execution times
   - Watch for cold start issues

3. **Test API Endpoints Directly**:
   ```bash
   curl https://your-app-name.vercel.app/api/health
   ```

## Security Considerations

1. **Environment Variables**: Use Vercel's environment variable encryption
2. **API Keys**: Rotate keys regularly
3. **CORS**: Ensure CORS is properly configured for your domain only
4. **Rate Limiting**: Monitor API usage and implement rate limiting

## Performance Optimization

1. **Cold Starts**: Vercel Functions may have cold start delays
2. **Caching**: Consider implementing caching for frequently accessed data
3. **Bundle Size**: Monitor and optimize React bundle size
4. **Database**: Optimize Supabase queries and indexes

## Maintenance

1. **Monitor Errors**: Set up error monitoring (Sentry, etc.)
2. **Update Dependencies**: Keep packages updated for security
3. **Backup Database**: Regular Supabase backups
4. **Monitor Usage**: Track Vercel function execution and billing

---

## Need Help?

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Google OAuth**: [developers.google.com](https://developers.google.com/identity/protocols/oauth2)

Your app should now be live at: `https://your-app-name.vercel.app` 🚀