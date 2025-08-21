# Quick Vercel Deployment Guide

This is the **TL;DR** version for deploying to Vercel. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fjob-board)

## 📋 Pre-Deploy Checklist

1. **Code in GitHub**: Ensure your code is pushed to GitHub
2. **Google OAuth**: Update redirect URIs in Google Cloud Console
3. **Environment Variables**: Have your keys ready (see below)

## ⚡ 5-Minute Deploy

### 1. Import to Vercel
- Go to [vercel.com](https://vercel.com)
- Click "New Project" → Import from GitHub
- Select your repository

### 2. Add Environment Variables
Copy these into Vercel's environment variables section:

```bash
# Frontend (Required)
REACT_APP_SUPABASE_URL=https://uquggvdhfoodkbytgyhr.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API (Required)
NODE_ENV=production
SUPABASE_URL=https://uquggvdhfoodkbytgyhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_CLIENT_ID=425689827554-8ku550l2bpup337o1gcbeilna2kdk06r.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA4ZPZVAOFAOGOV5B3
AWS_SECRET_ACCESS_KEY=OZA61shZVzY0Kx9btBNxI821fYYn8tdYMC9bhgn2
FRONTEND_URL=https://your-app-name.vercel.app
JWT_SECRET=your-secure-secret-here
```

### 3. Deploy
- Click "Deploy"
- Wait 2-3 minutes for build completion
- Get your live URL: `https://your-app-name.vercel.app`

### 4. Update OAuth Settings
After deployment, update these URLs:

**Google Cloud Console** → Your OAuth Client:
- **Authorized origins**: `https://your-app-name.vercel.app`
- **Redirect URIs**: `https://your-app-name.vercel.app`

**Supabase Dashboard** → Authentication → URL Configuration:
- **Site URL**: `https://your-app-name.vercel.app`
- **Redirect URLs**: `https://your-app-name.vercel.app/**`

## ✅ Test Your Deployment

1. Visit your Vercel URL
2. Test Google sign-in
3. Check API health: `https://your-app-name.vercel.app/api/health`
4. Try email sync functionality

## 🔧 Architecture

```
Frontend (React)     →  Vercel Static Hosting
Backend (API routes) →  Vercel Functions (/api/*)
Database            →  Supabase (PostgreSQL)
Authentication      →  Supabase Auth + Google OAuth
Email Processing    →  Gmail API + AWS Bedrock
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check environment variables are set |
| Auth doesn't work | Verify OAuth redirect URLs |
| API errors | Check Vercel function logs |
| Email sync fails | Verify Google OAuth scopes |

## 📊 What's Deployed

- ✅ **Frontend**: React app with job board UI
- ✅ **Authentication**: Google OAuth + Supabase
- ✅ **Job Management**: CRUD operations with drag-and-drop
- ✅ **Email Sync**: Gmail integration with AI analysis
- ✅ **Database**: Supabase PostgreSQL with RLS
- ✅ **APIs**: All backend routes as Vercel Functions

## 🔗 Live URLs

After deployment, these endpoints will be available:

- **App**: `https://your-app-name.vercel.app`
- **Health Check**: `https://your-app-name.vercel.app/api/health`
- **Jobs API**: `https://your-app-name.vercel.app/api/jobs`
- **Email Sync**: `https://your-app-name.vercel.app/api/emails/sync`

---

**🎉 That's it! Your job board should now be live on Vercel.**

For troubleshooting or advanced configuration, see the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) guide.