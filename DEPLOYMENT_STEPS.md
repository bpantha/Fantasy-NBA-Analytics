# Deployment Steps

## ✅ Step 1: GitHub Secrets (COMPLETED)
You've already added:
- `ESPN_S2`
- `ESPN_SWID`
- `LEAGUE_ID`

## Step 2: Push Code to Your Repository

```bash
# Add all new files
git add .

# Commit changes
git commit -m "Add fantasy basketball analytics website"

# Push to your new repository
git push origin master
# Or if you need to push to a different branch:
git push origin master:main
```

## Step 3: Test GitHub Actions

1. Go to your repo: https://github.com/bpantha/Fantasy-NBA-Analytics
2. Click on the **Actions** tab
3. You should see "Daily Analytics Update" workflow
4. Click "Run workflow" to test it manually
5. Watch it run and check if it successfully:
   - Exports analytics data
   - Commits JSON files to `data/analytics/`

## Step 4: Set Up Backend (Render)

1. Go to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect your GitHub repo: `bpantha/Fantasy-NBA-Analytics`
4. Configure:
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && python app.py`
5. Add Environment Variables:
   - `ESPN_S2` - (same value as GitHub secret)
   - `ESPN_SWID` - (same value as GitHub secret)
   - `HUGGINGFACE_API_KEY` - Get free at [huggingface.co](https://huggingface.co)
   - `LEAGUE_ID` - `39944776`
   - `YEAR` - `2026`
6. Deploy!

## Step 5: Set Up Frontend (GitHub Pages)

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

4. Push the built files or let GitHub Actions deploy automatically

## Step 6: Verify Everything Works

- ✅ GitHub Actions runs daily at 2 AM UTC
- ✅ Backend API serves data at Render URL
- ✅ Frontend displays analytics
- ✅ Chatbot queries work
