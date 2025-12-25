# GitHub Pages Deployment Guide

Complete guide for deploying your application to GitHub Pages with prerendering and performance optimizations.

## Overview

Your application is configured to deploy to **two environments**:
1. **GitHub Pages** (master branch) - Production at custom domain
2. **Netlify** (staging branch) - Staging environment

## GitHub Pages Deployment

### Configuration

**Workflow File**: `.github/workflows/deploy.yml`

**Triggers**:
- Push to `master` branch
- Pull request to `master` branch
- Manual trigger via GitHub Actions UI

**Domain**: Configured via `CNAME` file (bandincc.it)

### Features Enabled

✅ **Prerendering**
- All 6 routes prerendered at build time
- Search engines get static HTML
- Users get SPA experience

✅ **Performance Optimization**
- Code splitting (React, Leaflet vendors)
- Lazy loading components
- Minified bundles with Terser
- Console logs removed in production

✅ **Caching Headers**
- Static assets: 1 year cache
- Images/fonts: 1 year cache
- HTML: 1 hour cache with revalidation
- JSON: 1 hour cache

✅ **Security Headers**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy

✅ **SPA Routing**
- 404.html fallback for client-side routing
- .nojekyll to prevent Jekyll processing

### Workflow Steps

1. **Checkout code**
2. **Setup Node.js 18** with npm caching
3. **Install dependencies** (`npm ci`)
4. **Build with prerendering** (`npm run build:prerender`)
5. **Create _headers file** (caching and security)
6. **Create 404.html** (SPA routing fallback)
7. **Add .nojekyll** (disable Jekyll)
8. **Upload artifacts** to GitHub Pages
9. **Deploy** to GitHub Pages

### Build Output

After build, `dist/` contains:

```
dist/
├── index.html                    # Home (prerendered)
├── 404.html                      # SPA fallback
├── .nojekyll                     # Disable Jekyll
├── _headers                      # Cache/Security headers
├── CNAME                         # Custom domain
├── sitemap.xml                   # SEO sitemap
├── robots.txt                    # Search engine rules
├── og-image.svg                  # Social sharing image
├── how-to-become-driver/
│   └── index.html               # Prerendered
├── regional-laws/
│   └── index.html               # Prerendered
├── utilities/
│   └── index.html               # Prerendered
├── about/
│   └── index.html               # Prerendered
├── faq/
│   └── index.html               # Prerendered
└── assets/
    ├── react-vendor.[hash].js   # React chunk
    ├── leaflet-vendor.[hash].js # Leaflet chunk
    ├── [route].[hash].js        # Route chunks
    └── index.[hash].css         # Styles
```

## Netlify Deployment

### Configuration

**Workflow File**: `.github/workflows/netlify-deploy.yml`

**Triggers**:
- Push to `staging` branch
- Pull request to `staging` branch
- Manual trigger via GitHub Actions UI

**Domain**: Auto-generated Netlify URL or custom staging domain

### Additional Netlify Features

Netlify provides additional features via `netlify.toml`:

✅ **Automatic Bot Detection**
- Serves prerendered HTML to bots
- Serves SPA to users
- No configuration needed

✅ **Gzip + Brotli Compression**
- Automatic compression
- Better than GitHub Pages

✅ **Advanced Headers**
- Content-Encoding headers
- Better security headers

✅ **Instant Cache Invalidation**
- Clear cache on deploy
- GitHub Pages has CDN delay

## Deployment Commands

### Manual Deployment

```bash
# Deploy to GitHub Pages
npm run deploy

# This runs:
# 1. npm run build:prerender (build + prerender)
# 2. gh-pages -d dist (deploy to gh-pages branch)
```

### Automatic Deployment

**GitHub Pages (master branch)**:
```bash
git add .
git commit -m "Your changes"
git push origin master
```
→ Automatically deploys to GitHub Pages

**Netlify (staging branch)**:
```bash
git add .
git commit -m "Your changes"
git push origin staging
```
→ Automatically deploys to Netlify

## GitHub Pages Setup

### First Time Setup

1. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to "Pages" section
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `root`
   - Save

2. **Add Custom Domain** (if using):
   - Add CNAME record in DNS:
     ```
     CNAME bandincc.it -> coy123.github.io
     ```
   - In GitHub Pages settings:
     - Custom domain: `bandincc.it`
     - Enforce HTTPS: ✅

3. **Verify Deployment**:
   - Go to Actions tab
   - Check workflow runs
   - Visit your site

### Repository Settings Required

**Permissions**:
- Settings → Actions → General
- Workflow permissions: Read and write permissions
- Allow GitHub Actions to create and approve pull requests: ✅

**Pages**:
- Settings → Pages
- Build and deployment: GitHub Actions
- Source: GitHub Actions

## Testing Deployments

### Test Locally Before Deploy

```bash
# Build with prerendering
npm run build:prerender

# Check output
ls -la dist/
ls -la dist/about/

# Preview locally
npm run preview
# Open http://localhost:4173
```

### Test Prerendered Content

```bash
# View prerendered HTML
cat dist/about/index.html | grep "<title>"
cat dist/about/index.html | grep "meta name=\"description\""

# Check all routes
for route in "" "about" "faq" "utilities" "regional-laws" "how-to-become-driver"; do
  echo "=== $route ==="
  ls -lh dist/$route/index.html 2>/dev/null || ls -lh dist/index.html
done
```

### Test Deployed Site

```bash
# Check as regular user
curl -L https://bandincc.it/about | head -50

# Check as Googlebot
curl -A "Googlebot" -L https://bandincc.it/about | grep "<title>"

# Check headers
curl -I https://bandincc.it/assets/index.css
```

## Monitoring Deployments

### GitHub Actions

1. **Go to Actions tab** in repository
2. **View workflow runs**:
   - ✅ Green = Success
   - ❌ Red = Failed
   - 🟡 Yellow = In progress
3. **Click on run** to see logs
4. **Re-run failed jobs** if needed

### Deployment Status

**GitHub Pages**:
- Settings → Pages → View deployment
- See current deployment status
- View deployment history

**Netlify**:
- Log in to Netlify dashboard
- View deploys for your site
- Check build logs

## Troubleshooting

### Build Fails in GitHub Actions

**Error**: `npm ERR! missing script: build:prerender`

**Solution**: Make sure package.json has:
```json
"scripts": {
  "build:prerender": "npm run build && node scripts/prerender.js"
}
```

---

**Error**: `Cannot find module 'fs'`

**Solution**: Ensure `"type": "module"` is in package.json

---

**Error**: `dist directory not found`

**Solution**: Build runs before prerender script. Check build step.

### Deployment Succeeds But Site Broken

**Issue**: White screen / JavaScript errors

**Solution**: Check `base` in vite.config.ts:
- For custom domain: `base: '/'`
- For github.io subdirectory: `base: '/repo-name/'`

---

**Issue**: 404 on page refresh

**Solution**: 404.html should exist and match index.html
```bash
# Verify in workflow
- name: Create 404.html for SPA routing
  run: cp dist/index.html dist/404.html
```

---

**Issue**: Routing not working

**Solution**: Add .nojekyll file
```bash
# Verify in workflow
- name: Add .nojekyll file
  run: touch dist/.nojekyll
```

### Headers Not Applied

**Issue**: Cache headers not working

**Solution**: GitHub Pages has limited header support
- Only basic headers work via `_headers` file
- For full header control, use Netlify or Cloudflare

**Alternative**: Use service worker for caching

### Prerendering Not Working

**Issue**: Bots seeing SPA instead of HTML

**Solution**: 
1. Check prerendered files exist
2. Verify directory structure
3. Test with `curl -A "Googlebot"`

**GitHub Pages Limitation**: 
- No automatic bot detection
- Bots must request correct path
- Use `<link rel="alternate">` for discovery

## Performance Comparison

| Feature | GitHub Pages | Netlify |
|---------|--------------|---------|
| Prerendering | ✅ Yes | ✅ Yes |
| Bot Detection | ❌ Limited | ✅ Automatic |
| Compression | ✅ Gzip only | ✅ Gzip + Brotli |
| Headers | ⚠️ Limited | ✅ Full support |
| Cache Control | ⚠️ Basic | ✅ Advanced |
| CDN | ✅ GitHub CDN | ✅ Netlify Edge |
| Custom Domain | ✅ Yes | ✅ Yes |
| HTTPS | ✅ Free | ✅ Free |
| Build Time | ~2 min | ~1.5 min |
| Cost | 🆓 Free | 🆓 Free (starter) |

## Best Practices

### Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Add feature"
   git push origin feature/new-feature
   ```

2. **Test on Staging**:
   ```bash
   git checkout staging
   git merge feature/new-feature
   git push origin staging
   # Wait for Netlify deploy
   # Test on staging URL
   ```

3. **Deploy to Production**:
   ```bash
   git checkout master
   git merge staging
   git push origin master
   # Wait for GitHub Pages deploy
   # Verify on production
   ```

### Pre-Deploy Checklist

Before pushing to master:
- [ ] Run `npm run build:prerender` locally
- [ ] Test with `npm run preview`
- [ ] Check console for errors
- [ ] Verify all routes work
- [ ] Test on mobile viewport
- [ ] Run Lighthouse audit
- [ ] Check prerendered HTML files
- [ ] Test bot user agent
- [ ] Verify sitemap.xml
- [ ] Check robots.txt

### Post-Deploy Checklist

After deployment:
- [ ] Visit site and test navigation
- [ ] Check browser console for errors
- [ ] Test on mobile device
- [ ] Verify meta tags (View Page Source)
- [ ] Test social sharing links
- [ ] Check Google Search Console
- [ ] Verify analytics tracking
- [ ] Test performance with Lighthouse
- [ ] Check all prerendered routes
- [ ] Monitor error logs

## Optimization Tips

### Reduce Build Time

1. **Cache npm dependencies**:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'  # Already added
   ```

2. **Use npm ci instead of npm install**:
   ```yaml
   - run: npm ci  # Already using
   ```

### Reduce Bundle Size

1. **Check bundle size**:
   ```bash
   npm run build:prerender
   du -sh dist/assets/*.js
   ```

2. **Analyze bundles**:
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   # Add to vite.config.ts
   ```

### Improve Cache Hit Rate

1. **Use hash-based filenames** (already enabled)
2. **Separate vendor chunks** (already enabled)
3. **Don't change vendor code frequently**

## Maintenance

### Regular Tasks

**Weekly**:
- Check GitHub Actions for failed builds
- Review deployment logs

**Monthly**:
- Update dependencies: `npm update`
- Check bundle size: `npm run build:prerender && du -sh dist/`
- Review Google Search Console
- Check Core Web Vitals

**Quarterly**:
- Update Node.js version in workflows
- Review and update security headers
- Audit dependencies: `npm audit`
- Performance review with Lighthouse

## Support

### Useful Links

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [SEO Best Practices](https://developers.google.com/search/docs)

### Getting Help

**Build Issues**: Check GitHub Actions logs
**Site Issues**: Check browser console
**SEO Issues**: Check Google Search Console
**Performance**: Run Lighthouse audit

---

**Last Updated**: December 2025
**Maintained By**: Development Team
**Review Schedule**: Quarterly
