# Troubleshooting GitHub Pages 404

## Quick Checks

### 1. Verify gh-pages Branch Exists
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/branches
2. Look for a `gh-pages` branch
3. If it doesn't exist, the workflow hasn't deployed yet

### 2. Check Workflow Logs
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/actions
2. Click on the latest "Deploy Frontend to GitHub Pages" run
3. Expand "Deploy to GitHub Pages" step
4. Look for any errors or warnings
5. Verify it says "Published" at the end

### 3. Verify Files Were Deployed
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/tree/gh-pages
2. You should see files like:
   - `index.html`
   - `_next/` directory
   - Other static assets
3. If the branch is empty or doesn't exist, the deployment failed

### 4. Check GitHub Pages Settings
1. Go to: https://github.com/bpantha/Fantasy-NBA-Analytics/settings/pages
2. Under "Build and deployment":
   - Source should be: **"GitHub Actions"**
   - NOT "Deploy from a branch"
3. If it shows "Your site is ready to be published" but no URL, wait 2-3 minutes

### 5. Try the Direct URL
Sometimes the basePath causes issues. Try:
- https://bpantha.github.io/Fantasy-NBA-Analytics/
- https://bpantha.github.io/Fantasy-NBA-Analytics/index.html

### 6. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or try in incognito/private mode

## Common Issues

### Issue: gh-pages branch doesn't exist
**Solution:** Run the workflow manually from Actions tab

### Issue: Workflow completes but no files in gh-pages
**Solution:** Check workflow logs for errors in the "Deploy to GitHub Pages" step

### Issue: Files exist but 404 persists
**Solution:** 
- Wait 5-10 minutes (GitHub Pages can be slow to update)
- Check if basePath in next.config.js matches your repo name
- Verify the URL format matches your repository name

### Issue: GitHub Pages shows "Your site is ready to be published"
**Solution:** This means it's building. Wait 2-3 minutes, then refresh the Pages settings page.

## Next Steps if Still Not Working

1. Check the workflow logs for the exact error
2. Verify the `out` directory is being created during build
3. Try switching to "Deploy from a branch" temporarily to test
4. Check if there are any build errors in the "Build" step
