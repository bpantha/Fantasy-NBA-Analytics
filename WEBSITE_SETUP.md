# Website Setup Guide

## Overview

I've created a complete website structure with:

### ✅ Backend (Python Flask)
- **Location**: `backend/`
- **Files**:
  - `app.py` - Flask API server with all endpoints
  - `export_analytics.py` - Exports analytics to JSON
  - `update_data.py` - Simple wrapper for export
  - `requirements.txt` - Python dependencies

### ✅ Frontend (Next.js)
- **Location**: `frontend/`
- **Files**:
  - `src/app/page.tsx` - Main page with tabs
  - `src/components/TeamComparison.tsx` - Team vs Team view
  - `src/components/LeagueRankings.tsx` - Team vs League rankings
  - `src/components/Chatbot.tsx` - Sidebar chatbot
  - Configuration files for Next.js, Tailwind, TypeScript

### ✅ Automated Updates (GitHub Actions)
- **Location**: `.github/workflows/daily-update.yml`
- **Purpose**: Runs daily in the cloud to update analytics data
- **Benefits**: 
  - Runs even when your laptop is off
  - Automatically commits data to git
  - Free tier (2000 minutes/month)

### ✅ Deployment Configs
- `render.yaml` - Render.com backend configuration
- `.github/workflows/deploy-frontend.yml` - GitHub Pages deployment

## Next Steps to Deploy

### 1. Backend Setup (Render)

1. Go to [render.com](https://render.com) and sign up
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && python app.py`
5. Add Environment Variables:
   - `ESPN_S2` - Your ESPN cookie
   - `ESPN_SWID` - Your ESPN SWID cookie  
   - `HUGGINGFACE_API_KEY` - Get free at [huggingface.co](https://huggingface.co)
   - `LEAGUE_ID` - 39944776
   - `YEAR` - 2026
6. ~~Set up scheduled job~~ - **NOT NEEDED** (using GitHub Actions instead)

### 2. GitHub Actions Setup (Daily Updates)

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `ESPN_S2` - Your ESPN cookie
   - `ESPN_SWID` - Your ESPN SWID cookie
   - `LEAGUE_ID` - 39944776 (optional, defaults in workflow)
   - `YEAR` - 2026 (optional, defaults in workflow)
4. The workflow will automatically run daily at 2 AM UTC
5. You can also trigger it manually: **Actions** tab → **Daily Analytics Update** → **Run workflow**

### 3. Frontend Setup (GitHub Pages)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com/api
   ```

3. Build:
   ```bash
   npm run build
   npm run export
   ```

4. Deploy:
   - Push to GitHub
   - The GitHub Actions workflow will auto-deploy to Pages

### 4. Test Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
# API runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

**Test Daily Update:**
```bash
# Set environment variables
export ESPN_S2="your_cookie"
export ESPN_SWID="your_swid"
export LEAGUE_ID="39944776"
export YEAR="2026"

# Run update
cd backend
python update_data.py
```

## Features Implemented

✅ Team vs Team comparison with dropdowns
✅ Team vs League rankings table with percentiles
✅ Sidebar chatbot with Hugging Face LLM
✅ Dark mode design
✅ Mobile-first responsive layout
✅ **Cloud-based daily automated data updates** (GitHub Actions)
✅ JSON data storage
✅ All analytics from the Python script

## What Still Needs Work

1. **Player Data Export** - Need to enhance `export_analytics.py` to collect full player stats
2. **Historical Data** - Need to export data for all weeks, not just current/last
3. **Chatbot Enhancement** - May need to improve prompt engineering for better responses
4. **Visualizations** - Charts/graphs for trends (currently text-only)
5. **Error Handling** - Add better error messages and loading states

## Architecture Decisions

**Why GitHub Actions for daily updates?**
- ✅ Runs in the cloud (doesn't need your laptop)
- ✅ Free tier: 2000 minutes/month (plenty for daily updates)
- ✅ Direct git access to commit data
- ✅ Easy to monitor and debug
- ✅ Can trigger manually if needed

**Why Render for backend?**
- ✅ Free tier available
- ✅ Easy deployment from GitHub
- ✅ Handles API requests and chatbot

**Why GitHub Pages for frontend?**
- ✅ Free hosting
- ✅ Automatic deployment via GitHub Actions
- ✅ Fast CDN delivery
