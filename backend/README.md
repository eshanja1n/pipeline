# Pipeline Backend API

Backend API server for the Pipeline job board application with email processing and LLM integration.

## Features

- **Job Management**: CRUD operations for job applications
- **Email Processing**: Gmail API integration for email scanning
- **LLM Analysis**: AWS Bedrock integration for email-to-job matching
- **Authentication**: Supabase Auth integration
- **Rate Limiting**: Configurable rate limits for API endpoints
- **Security**: Helmet, CORS, and input validation

## Prerequisites

- Node.js 18+ 
- Redis (for background job processing)
- Supabase project
- Google Cloud Console project (for Gmail API)
- AWS account (for Bedrock access)

## Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   - Run the SQL migrations in the `../database/` directory through Supabase dashboard
   - Ensure RLS policies are applied

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Environment Variables

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Gmail API (for email processing)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI

### AWS Bedrock (for LLM analysis)
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### Optional
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `REDIS_URL` - Redis connection string
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

## API Endpoints

### Health
- `GET /api/health` - Health check with service status
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

### Authentication
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/signout` - Sign out user
- `GET /api/auth/profile` - Get user profile

### Jobs
- `GET /api/jobs` - List user's jobs
- `GET /api/jobs/:id` - Get specific job
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `PATCH /api/jobs/bulk-update` - Bulk update job statuses

### Email Processing
- `GET /api/emails/tracking` - Get email tracking history
- `GET /api/emails/content/:trackingId` - Get email content
- `POST /api/emails/sync` - Trigger email sync
- `POST /api/emails/process` - Process emails through LLM
- `GET /api/emails/stats` - Get processing statistics

## Security

- **Authentication**: Bearer token authentication using Supabase JWT
- **Rate Limiting**: Configurable rate limits per endpoint type
- **CORS**: Configured for frontend domain
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection**: Protected by Supabase RLS and parameterized queries

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Additional context in development
}
```

## Development

### Running Tests
```bash
npm test
```

### Code Structure
```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic services
├── utils/           # Utility functions
└── server.js        # Main server file
```

## Deployment

1. **Environment**: Set production environment variables
2. **Database**: Run migrations on production Supabase
3. **Scaling**: Consider horizontal scaling for high load
4. **Monitoring**: Set up logging and monitoring

## Next Steps

- [ ] Implement Gmail API integration
- [ ] Add AWS Bedrock LLM service
- [ ] Set up background job queue with Redis
- [ ] Add comprehensive logging
- [ ] Implement webhook endpoints for real-time updates