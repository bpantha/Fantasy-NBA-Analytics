# Quick Start Guide - Deploy Your Fantasy Basketball Analytics Website

## Overview
This guide will help you deploy both the backend (Render) and frontend (GitHub Pages) in about 15-20 minutes.

---

## Part 1: Backend Setup (Render) - ~10 minutes

### Step 1: Create Render Account
1. Go to [render.com](https://render.com) and sign up (free)

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub and select: **bpantha/Fantasy-NBA-Analytics**
3. Configure:
   - **Name:** `fantasy-analytics-api`
   - **Environment:** `Python 3`
   - **Build Command:** `cd backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && python app.py`
   - **Plan:** Free

### Step 3: Add Environment Variables
In the **Environment** tab, add:

```
ESPN_S2 = AEAwWV%2BaozyTIHV5vRNdeXJ1aSx4lqN5nfk77vBKuinqXNGPpl61Tr5HTZYF65Zkw0sNf8Ou74yyVnm87nQtTYRzr1cwox34dhiO5iPJI6OQ9dgPk181YScoAy8VTxgAA6enRIl%2Fxv8JEtv9SdRQ7z8%2Fm0TwKtXoROkpWK4j6%2Fjv1SymLiWZ6ny26HtNuzECTCLQ%2FPEkzenPbr4NIPe%2BZIMbHzc%2BrkCWOcSHR4zLDxEUUfmXNgRy3KGCPGpckgwMQw6X%2FNNNMVuaC3HLG7Za2mRy%2FZMFBowLEFd9c02qDj6Vrg%3D%3D

ESPN_SWID = {589899C8-709A-42B5-99E3-BF73799A3D36}

LEAGUE_ID = 39944776

YEAR = 2026

HUGGINGFACE_API_KEY = [Get from huggingface.co/settings/tokens]
```

**Get Hugging Face API Key:**
- Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- Create new token (read permission)
- Copy and paste as `HUGGINGFACE_API_KEY`

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait 2-5 minutes for deployment
3. Copy your service URL (e.g., `https://fantasy-analytics-api.onrender.com`)

### Step 5: Test Backend
Visit: `https://your-app.onrender.com/api/health`

Should return: `{"status":"ok","timestamp":"..."}`

**✅ Backend Complete!** Save your Render URL for the next step.

---

## Part 2: Frontend Setup (GitHub Pages) - ~5 minutes

### Step 1: Add GitHub Secret
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-render-app.onrender.com/api` (use your actual Render URL)

### Step 2: Enable GitHub Pages
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/settings/pages
2. Under **Source**, select **"GitHub Actions"**
3. Save

### Step 3: Trigger Deployment
The frontend will auto-deploy when you push. To trigger manually:

1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/actions
2. Click **"Deploy Frontend to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

Wait 2-3 minutes for deployment.

### Step 4: Access Your Site
Your site will be live at:
**https://bpantha.github.io/Fantasy-NBA-Analytics/**

---

## Part 3: Verify Everything Works

### Test Backend Endpoints:
- ✅ Health: `https://your-app.onrender.com/api/health`
- ✅ League Summary: `https://your-app.onrender.com/api/league/summary`
- ✅ Weeks: `https://your-app.onrender.com/api/weeks`
- ✅ Week Data: `https://your-app.onrender.com/api/week/14`

### Test Frontend:
- ✅ Visit your GitHub Pages URL
- ✅ Test Team vs Team comparison
- ✅ Test Team vs League rankings
- ✅ Test chatbot (may need Hugging Face API key)

---

## Troubleshooting

### Backend Issues:
- **Service won't start:** Check build logs in Render dashboard
- **500 errors:** Verify environment variables are set correctly
- **Slow first request:** Normal on free tier (spins down after 15 min inactivity)

### Frontend Issues:
- **API not connecting:** Verify `NEXT_PUBLIC_API_URL` secret is correct
- **404 errors:** GitHub Pages may need a few minutes to propagate

### Keep Backend Awake (Optional):
- Use [UptimeRobot](https://uptimerobot.com) (free)
- Ping your `/api/health` endpoint every 5 minutes

---

## You're Done! 🎉

Your fantasy basketball analytics website is now live!

**Features:**
- ✅ Daily automated data updates (12 AM MST)
- ✅ Team vs Team comparison
- ✅ Team vs League rankings
- ✅ Chatbot for custom analytics
- ✅ Mobile-friendly dark mode design

**Next Steps:**
- Customize styling if desired
- Add more analytics features
- Share with your league!
