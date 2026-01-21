# Fantasy Basketball Analytics Website

## Architecture

### Backend (Render - Python Flask)
- **Location**: `backend/`
- **Purpose**: 
  - Runs daily analytics via scheduled job
  - Serves API endpoints for frontend
  - Handles chatbot LLM queries
  - Exports data to JSON files

### Frontend (Next.js - GitHub Pages)
- **Location**: `frontend/`
- **Purpose**:
  - Team vs Team comparison interface
  - Team vs League rankings table
  - Sidebar chatbot
  - Mobile-first, dark mode design

### Data Storage
- **Location**: `data/analytics/`
- **Files**:
  - `week{number}.json` - Weekly analytics data
  - `league_summary.json` - Overall league standings
  - `players.json` - All player data
  - `teams.json` - Team information

## Setup Instructions

### Backend Setup (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd backend && pip install -r requirements.txt`
4. Set start command: `cd backend && python app.py`
5. Add environment variables:
   - `ESPN_S2` - Your ESPN cookie
   - `ESPN_SWID` - Your ESPN SWID cookie
   - `HUGGINGFACE_API_KEY` - Hugging Face API key (get free at huggingface.co)
   - `LEAGUE_ID` - Your league ID
   - `YEAR` - Season year

6. ~~Set up scheduled job~~ - **NOT NEEDED**: Use GitHub Actions instead (see below)

### Frontend Setup (GitHub Pages)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Set environment variable:
   - Create `.env.local`:
     ```
     NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com/api
     ```

3. Build and export:
   ```bash
   npm run build
   npm run export
   ```

4. Deploy to GitHub Pages:
   - Push `out/` directory to `gh-pages` branch
   - Enable GitHub Pages in repo settings

## Daily Updates

**GitHub Actions** runs the daily update workflow (`.github/workflows/daily-update.yml`) which:
1. Runs analytics export
2. Saves JSON files to `data/analytics/`
3. Commits and pushes to git automatically

**Setup:**
1. Go to your GitHub repository Settings → Secrets and variables → Actions
2. Add these secrets:
   - `ESPN_S2` - Your ESPN cookie
   - `ESPN_SWID` - Your ESPN SWID cookie
   - `LEAGUE_ID` - 39944776 (or set as default in workflow)
   - `YEAR` - 2026 (or set as default in workflow)

The workflow runs daily at 2 AM UTC. You can also trigger it manually from the Actions tab.

**Why GitHub Actions instead of Render?**
- Runs in the cloud (doesn't need your laptop on)
- Has direct git access to commit data
- Free tier includes 2000 minutes/month (plenty for daily updates)
- Easy to monitor and debug

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/weeks` - List available weeks
- `GET /api/week/<week>` - Get week analytics
- `GET /api/league/summary` - League summary
- `GET /api/players` - All player data
- `GET /api/teams` - All teams data
- `GET /api/compare/<team1>/<team2>` - Compare two teams
- `POST /api/chatbot` - Chatbot query

## Chatbot

Uses Hugging Face Inference API (free tier) to answer questions about the analytics data. The chatbot can:
- Query existing analytics data
- Answer questions about teams, players, matchups
- Provide insights based on historical data
