# Pipeline - AI-Powered Job Application Tracker

Pipeline is a smart job board application that automatically tracks your job applications by scanning your Gmail inbox and using AI to detect job-related emails. It provides a clean, drag-and-drop interface to manage your job application pipeline.

![Pipeline Screenshot](./public/pipe.png)

## Features

- 🎯 **Smart Email Detection**: Automatically scans Gmail for job-related emails
- 🤖 **AI-Powered Analysis**: Uses AWS Bedrock (Claude) to analyze emails and match them to jobs
- 📋 **Kanban Board Interface**: Drag-and-drop job cards between status columns
- 🔐 **Secure Authentication**: Google OAuth integration via Supabase
- 📊 **Real-time Updates**: Live synchronization across all your devices
- 🎨 **Modern UI**: Clean, minimalist design with Magic UI components
- 📧 **Email Processing**: Background job queue for scalable email analysis
- 🔍 **Smart Matching**: AI automatically links emails to existing job applications

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **@dnd-kit** for drag and drop functionality
- **Tailwind CSS** for styling
- **Supabase Auth** for authentication
- **Magic UI Components** for modern design

### Backend
- **Node.js** with Express
- **Supabase** for database and authentication
- **AWS Bedrock** for AI email analysis
- **Gmail API** for email integration
- **Bull Queue** with Redis for background jobs

## Quick Start

### Prerequisites

- Node.js 18+ 
- A Supabase account
- A Google Cloud Console project
- An AWS account with Bedrock access
- Redis (optional, for background job processing)

### 1. Clone and Install

```bash
git clone <repository-url>
cd pipeline-job-board

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the migration files in order from the `database/` directory:
   - `001_create_jobs_table.sql`
   - `002_create_email_tracking_table.sql`
   - `003_create_email_content_table.sql`
   - `004_create_rls_policies.sql`

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API and Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000` (for development)
   - Authorized redirect URIs: 
     - `http://localhost:3000` (for frontend)
     - `http://localhost:3001/auth/google/callback` (for backend)
5. Copy the Client ID and Client Secret

### 4. AWS Bedrock Setup

1. Ensure you have AWS CLI configured or have access keys
2. Request access to Claude models in AWS Bedrock console
3. Note your AWS region, access key, and secret key

### 5. Environment Configuration

#### Frontend (.env)
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

#### Backend (backend/.env)
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:
```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

### 6. Configure Supabase Authentication

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth Client ID and Client Secret
4. Set the redirect URL to match your frontend domain

### 7. Start the Application

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
pipeline-job-board/
├── src/                    # Frontend React app
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   ├── JobBoard.tsx   # Main kanban board
│   │   └── JobCard.tsx    # Job card component
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and API client
│   └── types/             # TypeScript type definitions
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware
│   │   └── config/        # Configuration files
│   └── package.json
├── database/              # SQL migration files
└── README.md
```

## Usage

### Initial Setup

1. **Sign In**: Click "Sign in with Google" to authenticate
2. **Grant Permissions**: Allow access to your Gmail account
3. **Sync Emails**: The system will automatically start scanning your emails
4. **Review Results**: Check the email analysis results in the dashboard

### Managing Jobs

- **Add Jobs**: Create job applications manually or let the system detect them from emails
- **Update Status**: Drag and drop job cards between columns (Applied → Interview → Offer/Rejected)
- **Edit Details**: Click on job cards to edit company, role, and other details
- **Delete Jobs**: Remove job applications you no longer want to track

### Email Processing

- **Automatic Sync**: Emails are automatically synced and analyzed
- **Manual Sync**: Use the "Refresh" button to trigger manual email sync
- **Review Analysis**: Check which emails were identified as job-related
- **Adjust Settings**: Configure email sync frequency and analysis parameters

## Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Deploy the `build/` directory to your hosting platform
3. Update environment variables for production

### Backend Deployment (Railway/Heroku/AWS)

1. Set up production environment variables
2. Deploy the `backend/` directory
3. Ensure Redis is available for background jobs
4. Update CORS settings for your frontend domain

## Troubleshooting

### Common Issues

1. **Gmail API Quota Exceeded**
   - Check your Google Cloud Console quotas
   - Implement rate limiting in email sync

2. **AWS Bedrock Access Denied**
   - Ensure you have requested access to Claude models
   - Check your AWS IAM permissions

3. **Supabase RLS Errors**
   - Verify that RLS policies are correctly applied
   - Check that user authentication is working

4. **OAuth Redirect Errors**
   - Ensure redirect URIs match in Google Cloud Console
   - Check that domains are correctly configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

**Note**: This application processes your email data. Please review the privacy policy and ensure you're comfortable with the data handling before use.