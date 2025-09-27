# 🚀 CryptoWallet Vercel Deployment Guide

## 📋 Prerequisites

- [x] Vercel CLI installed (`bun add -g vercel`)
- [ ] Vercel account (create at https://vercel.com)
- [ ] Database configured (Turso/PlanetScale/Neon)
- [ ] Environment variables ready

## 🏗️ Project Structure

This is a monorepo with two deployable apps:
- **Web App** (`/apps/web`): Next.js 15 frontend
- **Server** (`/apps/server`): Hono API backend

## 📦 Deployment Options

### Option 1: Deploy Both Apps Separately (Recommended)

#### Deploy Web App
```bash
cd apps/web
vercel

# For production deployment
vercel --prod
```

#### Deploy Server
```bash
cd apps/server
vercel

# For production deployment
vercel --prod
```

### Option 2: Deploy from Root
```bash
# From project root
bun run deploy

# For production
bun run deploy:prod
```

## 🔐 Environment Variables Setup

### Required for Web App (`apps/web`)
```env
NEXT_PUBLIC_SERVER_URL=https://your-server.vercel.app
```

### Required for Server (`apps/server`)
```env
CORS_ORIGIN=https://your-web-app.vercel.app
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://your-server.vercel.app
DATABASE_URL=libsql://your-database-url
PORT=3000
```

### Setting Variables in Vercel Dashboard

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for:
   - Production
   - Preview
   - Development (optional)

## 🗄️ Database Setup

### Using Turso (Recommended for SQLite)

1. Create account at [turso.tech](https://turso.tech)
2. Create a new database:
   ```bash
   turso db create cryptowallet
   ```
3. Get connection URL:
   ```bash
   turso db show cryptowallet --url
   ```
4. Create auth token:
   ```bash
   turso db tokens create cryptowallet
   ```
5. Set `DATABASE_URL` in Vercel:
   ```
   libsql://[DATABASE_NAME]-[ORG_NAME].turso.io?authToken=[TOKEN]
   ```

### Run Migrations

After setting up the database:
```bash
cd apps/server
bun run db:push
# or
bun run db:migrate
```

## 🚢 First Deployment Steps

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy Web App**
   ```bash
   cd apps/web
   vercel
   ```
   - Choose project name: `cryptowallet-web`
   - Set framework: Next.js (auto-detected)
   - Set build settings (auto-configured)

3. **Deploy Server**
   ```bash
   cd apps/server
   vercel
   ```
   - Choose project name: `cryptowallet-server`
   - Set framework: Other
   - Override build command: `cd ../.. && bun run build --filter=server`

4. **Configure Environment Variables**
   - Go to each project in Vercel Dashboard
   - Add all required environment variables
   - Update `NEXT_PUBLIC_SERVER_URL` and `CORS_ORIGIN` with actual URLs

5. **Redeploy with Variables**
   ```bash
   vercel --prod
   ```

## 🔄 Continuous Deployment

### GitHub Integration

1. Connect your GitHub repo in Vercel Dashboard
2. Configure branch deployments:
   - `main` → Production
   - `develop` → Preview
3. Automatic deployments on push

### Manual Deployment

```bash
# Deploy to preview
bun run deploy

# Deploy to production
bun run deploy:prod
```

## 🧪 Testing Deployment

### Verify Web App
- Visit: `https://your-app.vercel.app`
- Check console for errors
- Test API connections

### Verify Server
- Visit: `https://your-server.vercel.app`
- Test API endpoints
- Check CORS headers

## 🐛 Troubleshooting

### Build Failures
- Check logs: `vercel logs`
- Verify all dependencies are in `package.json`
- Ensure `bun.lockb` is committed

### Environment Variables Not Working
- Check variable names (case-sensitive)
- Verify in Dashboard → Settings → Environment Variables
- Redeploy after adding variables

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database is accessible from Vercel's network
- Ensure auth tokens are valid

### CORS Issues
- Verify `CORS_ORIGIN` matches your frontend URL
- Check server CORS middleware configuration

## 📝 Useful Commands

```bash
# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove a deployment
vercel rm [deployment-url]

# Set environment variable via CLI
vercel env add DATABASE_URL

# Pull environment variables locally
vercel env pull
```

## 🔗 Important Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Turso Database](https://turso.tech)

## 📞 Support

For deployment issues:
- Check [Vercel Status](https://vercel-status.com)
- Visit [Vercel Support](https://vercel.com/support)
- Review [Vercel Docs](https://vercel.com/docs)