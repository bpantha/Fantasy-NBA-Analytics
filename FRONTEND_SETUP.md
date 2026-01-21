# Frontend Setup Guide

## Prerequisites
- Backend API deployed on Render (get the URL)
- Node.js installed (v18 or higher)

## Step-by-Step Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Create Environment File
Create `.env.local` in the `frontend/` directory:
```bash
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com/api
```
Replace `your-render-app.onrender.com` with your actual Render URL.

### 3. Test Locally (Optional)
```bash
npm run dev
```
Visit http://localhost:3000 to test locally.

### 4. Build for Production
```bash
npm run build
npm run export
```
This creates the `out/` directory with static files.

### 5. Deploy to GitHub Pages

#### Option A: Manual Deploy
1. Copy contents of `out/` directory
2. Create a new branch called `gh-pages`
3. Push the files to that branch
4. Enable GitHub Pages in repo settings pointing to `gh-pages` branch

#### Option B: Automatic Deploy (Recommended)
The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) will automatically deploy when you push to main.

**To enable:**
1. Go to your repo: https://github.com/bpantha/Fantasy-NBA-Analytics
2. Go to **Settings** → **Pages**
3. Under **Source**, select **"GitHub Actions"**
4. The workflow will deploy automatically on next push

**To trigger deployment:**
```bash
# Update .env.local with your Render URL
# Then commit and push
git add frontend/.env.local
git commit -m "Add frontend environment config"
git push new-origin master
```

### 6. Update Frontend Environment
Since GitHub Pages is static, we need to set the API URL at build time:

1. Go to your repo **Settings** → **Secrets and variables** → **Actions**
2. Add a new secret:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-render-app.onrender.com/api`

3. Update `.github/workflows/deploy-frontend.yml` to use this secret (already configured)

### 7. Access Your Site
Once deployed, your site will be available at:
- `https://bpantha.github.io/Fantasy-NBA-Analytics/`

Or if you set a custom domain:
- Your custom domain

## Troubleshooting
- **Build fails:** Check Node.js version (need 18+)
- **API not connecting:** Verify `NEXT_PUBLIC_API_URL` is correct
- **CORS errors:** Ensure backend CORS is configured (already done)
- **404 on refresh:** This is normal for SPAs on GitHub Pages, consider using a custom domain or different hosting

## Next Steps
1. Test all features:
   - Team vs Team comparison
   - Team vs League rankings
   - Chatbot functionality
2. Customize styling if needed
3. Add any additional features
