# Performance Optimization Guide

This document outlines all the performance optimizations implemented in the Licenzia project.

## 1. Image Optimization

### Lazy Loading
- **Implementation**: All images in the Table component now use native browser lazy loading
- **Location**: `src/components/Table.tsx`
- **Attributes added**:
  - `loading="lazy"` - Defers loading until image is near viewport
  - `decoding="async"` - Allows browser to decode image asynchronously
- **Impact**: Reduces initial page load time, saves bandwidth for images not in viewport

### Image Sources
- Municipality crests are loaded from external sources (Wikimedia)
- Consider implementing responsive images with `srcset` for different screen sizes
- **Recommendation**: Convert large images to WebP format for better compression

## 2. Code Splitting & Lazy Loading

### Route-Level Code Splitting
- **Implementation**: All page components are lazy loaded using React.lazy()
- **Location**: `src/App.tsx`
- **Components split**:
  - Home
  - HowToBecomeDriver
  - RegionalLaws
  - Utilities
  - About
  - FAQ
- **Impact**: Initial bundle size reduced significantly, faster initial page load

### Component-Level Lazy Loading
- **MapView Component**: Lazy loaded only when map tab is activated
- **Location**: `src/pages/Home.tsx`
- **Impact**: Leaflet library (~150KB) only loaded when needed
- **Benefit**: Reduces initial bundle size for users who don't use the map feature

### Loading States
- Custom loading fallback components prevent layout shift
- Smooth user experience during code splitting transitions

## 3. Bundle Size Optimization

### Vite Configuration
**Location**: `vite.config.ts`

#### Manual Chunk Splitting
```javascript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'leaflet-vendor': ['leaflet']
}
```
- Separates vendor libraries into dedicated chunks
- Enables better browser caching
- Users don't re-download vendor code when app code changes

#### Minification Settings
- **Minifier**: Terser (production-grade)
- **Console Removal**: `drop_console: true` removes all console.* calls
- **Debug Removal**: `drop_debugger: true` removes debugger statements
- **Source Maps**: Disabled in production (can be enabled for debugging)

#### CSS Optimization
- **CSS Code Splitting**: Enabled
- **Deferred Stylesheets**: Custom plugin preloads CSS files
- Non-critical CSS loaded asynchronously

## 4. Compression

### Netlify Configuration
**Location**: `netlify.toml`

#### Compression Formats
- **Gzip**: Supported for all browsers
- **Brotli**: Modern compression (better than gzip)
- Automatically served based on browser support

#### Cache Control Headers
- **Static Assets** (`/assets/*`): 1 year cache (`max-age=31536000, immutable`)
- **Images** (*.png, *.jpg, *.svg): 1 year cache (immutable)
- **Fonts** (*.woff2): 1 year cache (immutable)
- **HTML files**: 1 hour cache with revalidation
- **JSON data**: 1 hour cache with revalidation

#### Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts unnecessary browser features

## 5. Additional Optimizations

### React Performance
- **useMemo**: Used for expensive computations (search filtering, data sorting)
- **useCallback**: Could be added for event handlers if needed
- **React.memo**: Could wrap components that receive same props frequently

### Data Loading
- JSON data loaded once at build time
- No runtime API calls for static data
- Consider implementing pagination for large datasets

### Font Loading
- System fonts used (no custom font downloads)
- Reduces load time and prevents FOUT (Flash of Unstyled Text)

### Service Worker
- PWA support with service worker registration
- Offline capability (if service worker is properly configured)

## 6. Performance Metrics

### Expected Improvements
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Total Blocking Time (TBT)**: < 300ms

### Bundle Size Analysis
Run `npm run build` to see:
- Vendor chunks: react-vendor (~150KB), leaflet-vendor (~150KB)
- Route chunks: Each page component ~10-30KB
- CSS: ~50-100KB (with Tailwind purged)

## 7. Monitoring & Testing

### Tools to Use
1. **Lighthouse**: Run in Chrome DevTools for performance audit
2. **WebPageTest**: Test from multiple locations
3. **Bundle Analyzer**: Add `rollup-plugin-visualizer` to visualize bundle
4. **Coverage Tool**: Chrome DevTools > Coverage to find unused code

### Recommended Additions
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [visualizer({ open: true })]
```

## 8. Future Optimizations

### Potential Improvements
1. **Image CDN**: Use Cloudinary or imgix for dynamic image optimization
2. **Preconnect**: Add `<link rel="preconnect">` for external domains
3. **Resource Hints**: Add `<link rel="dns-prefetch">` for external resources
4. **Web Workers**: Move heavy computations to web workers
5. **IndexedDB**: Cache large datasets in IndexedDB
6. **Virtual Scrolling**: Implement for large tables (react-window or react-virtualized)
7. **Progressive Image Loading**: Blur-up effect for images
8. **HTTP/2 Server Push**: Push critical resources
9. **Critical CSS**: Inline above-the-fold CSS
10. **Tree Shaking**: Ensure unused code is eliminated

### Performance Budget
Set budgets to prevent regressions:
- Total page weight: < 500KB
- JavaScript: < 200KB
- CSS: < 100KB
- Images: < 200KB
- Time to Interactive: < 3.5s

## 9. Deployment Checklist

Before deploying:
- [ ] Run `npm run build` and check for warnings
- [ ] Test lazy loading in production build
- [ ] Verify compression is working (check Network tab)
- [ ] Run Lighthouse audit (aim for 90+ score)
- [ ] Test on slow 3G connection
- [ ] Check mobile performance (especially iOS)
- [ ] Verify service worker is caching correctly
- [ ] Test with browser cache disabled
- [ ] Monitor Core Web Vitals in production

## 10. Maintenance

### Regular Tasks
- **Monthly**: Review bundle size and check for bloat
- **Quarterly**: Update dependencies and check for performance regressions
- **Yearly**: Re-evaluate architecture and consider new optimization techniques

### Monitoring
- Set up Real User Monitoring (RUM) with tools like:
  - Google Analytics (Web Vitals)
  - Sentry Performance Monitoring
  - New Relic
  - Datadog RUM

---

**Last Updated**: December 2025
**Performance Score Target**: 90+ on Lighthouse
**Load Time Target**: < 2 seconds on 4G
