# How to Trigger Analytics Export

The analytics export can be triggered in several ways:

## Option 1: GitHub Actions (Recommended)

1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/actions
2. Click on "Daily Analytics Update" workflow
3. Click "Run workflow" button (top right)
4. Select "master" branch
5. Click "Run workflow"

This will:
- Export all historical weeks (1 through current-1)
- Export current week as fallback
- Commit and push the updated JSON files

## Option 2: Manual Local Run

If you have ESPN credentials set as environment variables:

```bash
cd backend
export ESPN_S2="your_s2_cookie"
export ESPN_SWID="your_swid_cookie"
export LEAGUE_ID=39944776
export YEAR=2026
python3 export_analytics.py
```

Then commit and push:
```bash
git add data/analytics/*.json
git commit -m "Update analytics data"
git push new-origin master
```

## Option 3: Automatic Daily Run

The workflow runs automatically every day at 12 AM MST (7 AM UTC).

## What Happens After Export

Once the export completes:
- **Current Week**: Will be fetched live from ESPN API when requested
- **Historical Weeks**: Will use the exported JSON files
- **Daily Updates**: Will update historical data and the current week fallback
