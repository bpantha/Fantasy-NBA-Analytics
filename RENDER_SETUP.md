# Render Backend Setup Guide

## Step-by-Step Instructions

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up for a free account (or sign in if you already have one)

### 2. Create New Web Service
1. Click **"New +"** button in the top right
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: **bpantha/Fantasy-NBA-Analytics**

### 3. Configure the Service
Use these exact settings:

**Basic Settings:**
- **Name:** `fantasy-analytics-api` (or any name you prefer)
- **Region:** Choose closest to you (e.g., Oregon for US West)
- **Branch:** `master`
- **Root Directory:** Leave empty (or set to `backend` if Render requires it)

**Build & Deploy:**
- **Environment:** `Python 3`
- **Build Command:** `cd backend && pip install -r requirements.txt`
- **Start Command:** `cd backend && python app.py`

**Plan:**
- Select **"Free"** plan

### 4. Add Environment Variables
Click **"Environment"** tab and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `ESPN_S2` | `AEAwWV%2BaozyTIHV5vRNdeXJ1aSx4lqN5nfk77vBKuinqXNGPpl61Tr5HTZYF65Zkw0sNf8Ou74yyVnm87nQtTYRzr1cwox34dhiO5iPJI6OQ9dgPk181YScoAy8VTxgAA6enRIl%2Fxv8JEtv9SdRQ7z8%2Fm0TwKtXoROkpWK4j6%2Fjv1SymLiWZ6ny26HtNuzECTCLQ%2FPEkzenPbr4NIPe%2BZIMbHzc%2BrkCWOcSHR4zLDxEUUfmXNgRy3KGCPGpckgwMQw6X%2FNNNMVuaC3HLG7Za2mRy%2FZMFBowLEFd9c02qDj6Vrg%3D%3D` | Your ESPN cookie |
| `ESPN_SWID` | `{589899C8-709A-42B5-99E3-BF73799A3D36}` | Your ESPN SWID |
| `LEAGUE_ID` | `39944776` | Your league ID |
| `YEAR` | `2026` | Season year |
| `HUGGINGFACE_API_KEY` | `your_huggingface_key` | Get free at [huggingface.co](https://huggingface.co/settings/tokens) |
| `PORT` | `5000` | Port (Render sets this automatically, but good to have) |

**To get Hugging Face API Key:**
1. Go to [huggingface.co](https://huggingface.co)
2. Sign up/login
3. Go to Settings → Access Tokens
4. Create a new token (read permission is enough)
5. Copy the token and paste it as `HUGGINGFACE_API_KEY`

### 5. Deploy
1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for deployment to complete (usually 2-5 minutes)
4. Once deployed, you'll get a URL like: `https://fantasy-analytics-api.onrender.com`

### 6. Test the API
Once deployed, test these endpoints:
- Health check: `https://your-app.onrender.com/api/health`
- League summary: `https://your-app.onrender.com/api/league/summary`
- Available weeks: `https://your-app.onrender.com/api/weeks`

### 7. Important Notes
- **Free tier limitations:**
  - Service spins down after 15 minutes of inactivity
  - First request after spin-down may take 30-60 seconds
  - 750 hours/month free (enough for always-on if you want)
  
- **To keep service awake (optional):**
  - Use a free service like [UptimeRobot](https://uptimerobot.com) to ping your health endpoint every 5 minutes
  - Or upgrade to paid plan for always-on

### Troubleshooting
- **Build fails:** Check build logs, ensure all dependencies are in `requirements.txt`
- **Service crashes:** Check logs in Render dashboard
- **API returns 500:** Check environment variables are set correctly
- **CORS errors:** Already handled in `app.py` with `CORS(app)`

## Next Step
Once backend is deployed, proceed to frontend setup!
