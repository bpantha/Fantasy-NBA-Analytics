# GitHub Pages Setup - Fix 404 Error

## Step 1: Enable GitHub Pages

1. Go to your repository: https://github.com/bpantha/Fantasy-NBA-Analytics
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select **"GitHub Actions"** (NOT "Deploy from a branch")
5. Click **Save**

## Step 2: Verify Workflow Has Run

1. Go to **Actions** tab
2. Look for **"Deploy Frontend to GitHub Pages"** workflow
3. If it hasn't run, click it → **"Run workflow"** → **"Run workflow"**
4. Wait for it to complete (should show green checkmark)

## Step 3: Check Deployment

1. After workflow completes, go back to **Settings** → **Pages**
2. You should see: "Your site is live at https://bpantha.github.io/Fantasy-NBA-Analytics/"
3. It may take 1-2 minutes to propagate

## Step 4: Verify the Site

Visit: **https://bpantha.github.io/Fantasy-NBA-Analytics/**

If you still see 404:
- Wait 2-3 more minutes (DNS propagation)
- Check the Actions tab to ensure workflow completed successfully
- Verify the workflow created files in the `gh-pages` branch

## Troubleshooting

### Workflow Fails
- Check the Actions tab for error messages
- Ensure `NEXT_PUBLIC_API_URL` secret is set (even if backend isn't ready)

### Still 404 After 5 Minutes
1. Go to **Settings** → **Pages**
2. Check if it shows "Your site is ready to be published"
3. If not, the workflow may have failed - check Actions tab

### Files Not Deploying
- The workflow should create/update a `gh-pages` branch
- Check if this branch exists: https://github.com/bpantha/Fantasy-NBA-Analytics/branches

## Quick Fix Checklist

- [ ] GitHub Pages enabled with "GitHub Actions" as source
- [ ] Workflow has run successfully (green checkmark)
- [ ] Waited 2-3 minutes after workflow completed
- [ ] Checked Actions tab for any errors
- [ ] Verified `gh-pages` branch exists
