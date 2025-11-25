# CV Maker Backend API

Node.js/Express backend with PostgreSQL database for the CV Maker application.

## Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Clerk account (for authentication)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
# Create database
createdb cv_maker

# Run migrations
psql -d cv_maker -f migrations/001_initial_schema.sql
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database credentials
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
All endpoints require `Authorization: Bearer <clerk_token>` header.

### CV Endpoints

- `GET /api/cvs` - Get all CVs for authenticated user
- `GET /api/cvs/:id` - Get specific CV
- `POST /api/cvs` - Create new CV
- `PUT /api/cvs/:id` - Update CV
- `DELETE /api/cvs/:id` - Delete CV

### User Endpoints

- `GET /api/user/profile` - Get current user profile
- `POST /api/user/sync` - Sync user from Clerk

### Health Check

- `GET /health` - Server health check

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `clerk_user_id` (VARCHAR) - Clerk user ID
- `email` (VARCHAR) - User email
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### CVs Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `title` (VARCHAR) - CV title
- `template` (VARCHAR) - Template name
- `data` (JSONB) - CV data
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── server.ts        # Express app
├── migrations/          # Database migrations
└── package.json
```
