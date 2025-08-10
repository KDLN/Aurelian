# Deployment Guide for Aurelian

This guide will help you deploy Aurelian to production with Vercel (frontend), Supabase (database), and Google Cloud Run (backend services).

## Prerequisites

- GitHub repository (already set up)
- Vercel account (free tier works)
- Supabase account (free tier works)
- Google Cloud Platform account with billing enabled
- gcloud CLI installed locally

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save your project credentials:
   - **Project URL**: `https://YOUR_PROJECT.supabase.co`
   - **Anon Key**: `YOUR_ANON_KEY`
   - **Service Role Key**: `YOUR_SERVICE_KEY` (keep this secret!)

### Configure Database
1. Go to SQL Editor in Supabase dashboard
2. Run the Prisma migrations to create tables:
   ```sql
   -- The schema from prisma/schema.prisma needs to be applied
   -- Or use Supabase's migration system
   ```

### Set up Authentication
1. Go to Authentication → Providers
2. Enable Email provider (Magic Link)
3. Configure email templates if desired
4. Set redirect URLs:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/*`

### Get JWT Secret for Backend
1. Go to Settings → API
2. Copy the JWT Secret (needed for realtime server)

## 2. Vercel Setup (Frontend)

### Connect Repository
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Select `apps/web` as the root directory
5. Framework Preset: Next.js

### Configure Environment Variables
In Vercel project settings → Environment Variables, add:

```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_WS_URL=https://realtime-SERVICE_NAME-HASH.a.run.app
```

### Deploy Settings
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

## 3. Google Cloud Run Setup (Backend Services)

### Initial GCP Setup
```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create aurelian \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for Aurelian"
```

### Set up GitHub Actions Secrets
In your GitHub repository settings → Secrets and variables → Actions, add:

```bash
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
SERVICE_ACCOUNT_EMAIL=github-deploy@your-project.iam.gserviceaccount.com
WORKLOAD_IDENTITY_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github
REALTIME_SERVICE=aurelian-realtime
WORKER_SERVICE=aurelian-worker
```

### Set up Workload Identity Federation
```bash
# Create service account
gcloud iam service-accounts create github-deploy \
  --display-name="GitHub Actions Deploy"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Set up Workload Identity
gcloud iam workload-identity-pools create github \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc github \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Create Dockerfiles

Create `apps/realtime/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/realtime/package*.json ./apps/realtime/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY apps/realtime ./apps/realtime
COPY prisma ./prisma

# Build TypeScript
WORKDIR /app/apps/realtime
RUN npm run build

# Expose port
EXPOSE 8787

# Start server
CMD ["npm", "start"]
```

Create `apps/worker/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY apps/worker ./apps/worker
COPY prisma ./prisma

# Build TypeScript
WORKDIR /app/apps/worker
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
```

### Configure Cloud Run Services

Deploy realtime server:
```bash
gcloud run deploy aurelian-realtime \
  --source apps/realtime \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --port 8787 \
  --set-env-vars SUPABASE_JWT_SECRET=your_jwt_secret_here
```

Deploy worker service:
```bash
gcloud run deploy aurelian-worker \
  --source apps/worker \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --port 8080 \
  --set-env-vars DATABASE_URL=your_database_url
```

## 4. Update Frontend with Production URLs

After deploying Cloud Run services, get their URLs:
```bash
gcloud run services describe aurelian-realtime --region us-central1 --format 'value(status.url)'
```

Update Vercel environment variables:
- `NEXT_PUBLIC_WS_URL` = Cloud Run realtime service URL (replace http with wss)

## 5. DNS and Custom Domain (Optional)

### For Vercel (Frontend)
1. In Vercel project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### For Cloud Run (Backend)
```bash
# Map custom domain to Cloud Run service
gcloud beta run domain-mappings create \
  --service aurelian-realtime \
  --domain realtime.yourdomain.com \
  --region us-central1
```

## 6. Monitoring and Logs

### Vercel
- View logs in Vercel dashboard → Functions tab
- Analytics available in Analytics tab

### Google Cloud Run
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitor metrics
gcloud monitoring metrics-descriptors list --filter="metric.type:run.googleapis.com"
```

### Supabase
- Database logs in Supabase dashboard → Logs
- Auth logs in Authentication → Logs

## 7. Environment Variables Summary

### Vercel (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_WS_URL=wss://realtime-url.a.run.app
```

### Cloud Run - Realtime Server
```env
PORT=8787
SUPABASE_JWT_SECRET=your_jwt_secret
```

### Cloud Run - Worker Service
```env
PORT=8080
DATABASE_URL=postgresql://user:pass@host/db
DIRECT_URL=postgresql://user:pass@host/db
```

## 8. Testing Production Deployment

1. **Test authentication**:
   - Sign up with magic link
   - Verify email arrives
   - Confirm login works

2. **Test real-time features**:
   - Open multiple browser tabs
   - Move character in /play
   - Verify movement syncs

3. **Test database operations**:
   - Create missions
   - Accept missions
   - Verify data persists

## 9. Rollback Strategy

### Vercel
- Use instant rollback in Vercel dashboard
- Previous deployments available in Deployments tab

### Cloud Run
```bash
# List revisions
gcloud run revisions list --service aurelian-realtime

# Rollback to previous revision
gcloud run services update-traffic aurelian-realtime \
  --to-revisions PREVIOUS_REVISION=100
```

## 10. Cost Optimization

### Free Tier Limits
- **Vercel**: 100GB bandwidth, unlimited deployments
- **Supabase**: 500MB database, 2GB bandwidth, 50K auth users
- **Google Cloud**: $300 free credits, Cloud Run free tier includes 2M requests/month

### Cost Saving Tips
- Set Cloud Run min instances to 0 for dev/staging
- Use Supabase connection pooling
- Enable Cloud CDN for static assets
- Monitor usage regularly

## Troubleshooting

### WebSocket Connection Issues
- Ensure Cloud Run service allows unauthenticated access
- Check CORS settings in realtime server
- Verify WebSocket URL uses wss:// for production

### Database Connection Issues
- Check DATABASE_URL format
- Verify Supabase allows connections from Cloud Run
- Check connection pooling settings

### Build Failures
- Clear build cache in Vercel
- Check Node.js version compatibility
- Verify all environment variables are set

## Security Checklist

- [ ] All secrets stored in environment variables
- [ ] HTTPS/WSS enabled for all services
- [ ] Database connection uses SSL
- [ ] JWT secret is strong and unique
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)

## Support

For issues or questions:
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Google Cloud: https://cloud.google.com/support