# Deployment Guide - CodeWithBotina Frontend

Complete guide for deploying the frontend to Cloudflare Pages with custom domain.

---

## Prerequisites Checklist

- [ ] GitHub repository exists and is public/connected to Cloudflare
- [ ] Supabase project created with posts table
- [ ] Backend API deployed at api.codewithbotina.com
- [ ] Cloudflare account managing codewithbotina.com domain
- [ ] All environment variables documented

---

## Step 1: Prepare for Deployment

### 1.1 Verify Build Works Locally

```bash
cd frontend
npm run build
npm run preview
```

Access http://localhost:4321 and verify:
- All pages load correctly
- Search functionality works
- Contact form submits successfully
- Images load properly
- No console errors

### 1.2 Verify Environment Variables

Ensure `.env` contains production values:
```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
PUBLIC_API_URL=https://api.codewithbotina.com
PUBLIC_SITE_URL=https://blog.codewithbotina.com
```

### 1.3 Run Tests

```bash
npm run test
npm run test:coverage
```

Ensure all tests pass before deploying.

---

## Step 2: Configure Cloudflare Pages

### 2.1 Create New Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Pages**
3. Click **"Create application"** → **"Connect to Git"**
4. Select your GitHub repository: `codewithbotina-blog`
5. Click **"Begin setup"**

### 2.2 Configure Build Settings

**Project Name:** `codewithbotina-blog`

**Build Configuration:**
- **Framework preset:** Astro
- **Branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `frontend/`

**Advanced Settings:**
- Node.js version: `18` or `22`
- Environment variables: (see next step)

### 2.3 Add Environment Variables

In Cloudflare Pages → Settings → Environment Variables:

**Production Environment:**

| Variable Name | Value | Example |
|---------------|-------|---------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbG...` |
| `PUBLIC_API_URL` | Backend API URL | `https://api.codewithbotina.com` |
| `PUBLIC_SITE_URL` | Frontend URL | `https://blog.codewithbotina.com` |
| `PUBLIC_SITE_NAME` | Site name | `CodeWithBotina` |
| `PUBLIC_SITE_DESCRIPTION` | Meta description | `Technical blog...` |
| `PUBLIC_AUTHOR_NAME` | Author name | `Diego Alejandro Botina` |
| `PUBLIC_AUTHOR_EMAIL` | Contact email | `support@codewithbotina.com` |
| `PUBLIC_AUTHOR_URL` | Portfolio URL | `https://portfolio.codewithbotina.com` |

**Social Media Variables:**
- `PUBLIC_INSTAGRAM_URL`
- `PUBLIC_FACEBOOK_URL`
- `PUBLIC_TIKTOK_URL`
- `PUBLIC_LINKEDIN_URL`
- `PUBLIC_PATREON_URL`
- `PUBLIC_YOUTUBE_URL`
- `PUBLIC_GITHUB_URL`
- `PUBLIC_PORTFOLIO_URL`

Click **"Save and Deploy"**

---

## Step 3: Configure Custom Domain

### 3.1 Wait for Initial Deployment

Cloudflare will automatically deploy your site to:
`https://codewithbotina-blog.pages.dev`

Wait for deployment to complete (2-5 minutes).

### 3.2 Verify Default Deployment

```bash
curl -I https://codewithbotina-blog.pages.dev
```

Should return `200 OK`.

### 3.3 Add Custom Domain

1. Cloudflare Pages → Settings → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter: `blog.codewithbotina.com`
4. Click **"Continue"**

Cloudflare will automatically:
- Create DNS record (if domain is in Cloudflare)
- Provision SSL certificate
- Configure redirects

### 3.4 Verify DNS Configuration

Go to Cloudflare Dashboard → DNS → Records

You should see:
```
Type: CNAME
Name: blog
Target: codewithbotina-blog.pages.dev
Proxy: Enabled (orange cloud)
```

If not automatically created, add it manually.

### 3.5 Wait for SSL Certificate

SSL provisioning takes 1-5 minutes.

Verify:
```bash
curl -I https://blog.codewithbotina.com
```

Should return `200 OK` with HTTPS.

---

## Step 4: Post-Deployment Verification

### 4.1 Test All Pages

Visit each page and verify:
- [ ] https://blog.codewithbotina.com (home)
- [ ] https://blog.codewithbotina.com/posts/mi-primer-post (post detail)
- [ ] https://blog.codewithbotina.com/contact (contact form)
- [ ] https://blog.codewithbotina.com/about (about page)
- [ ] https://blog.codewithbotina.com/404 (404 page)
- [ ] https://blog.codewithbotina.com/rss.xml (RSS feed)

### 4.2 Test Search Functionality

1. Go to home page
2. Use search bar
3. Verify posts filter in real-time
4. Clear search with X button

### 4.3 Test Contact Form

1. Go to /contact
2. Fill out form with valid data
3. Submit and verify:
   - Success message appears
   - Email arrives at support@codewithbotina.com
   - Data saved in Supabase contacts table

### 4.4 Test Responsive Design

Test on:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1440px width)

Verify layout adapts correctly.

### 4.5 Run Lighthouse Audit

1. Open Chrome DevTools
2. Navigate to **Lighthouse** tab
3. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO

**Target Scores:** All categories > 95

---

## Step 5: Continuous Deployment

### 5.1 Automatic Deployments

Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "feat: add new blog post"
git push origin main
```

Cloudflare Pages will:
1. Pull latest code
2. Run `npm run build`
3. Deploy to production
4. Invalidate cache

### 5.2 Monitor Deployments

View deployment status:
- Cloudflare Dashboard → Pages → codewithbotina-blog → Deployments

Each deployment shows:
- Build logs
- Deployment time
- Status (success/failed)
- Preview URL

### 5.3 Rollback Procedure

If a deployment breaks the site:

1. Go to Deployments tab
2. Find last working deployment
3. Click **"..."** → **"Rollback to this deployment"**
4. Confirm rollback

Site reverts to previous version instantly.

---

## Step 6: Performance Optimization

### 6.1 Cloudflare Settings

Configure in Cloudflare Dashboard:

**Speed → Optimization:**
- [ ] Auto Minify: HTML, CSS, JS enabled
- [ ] Brotli compression enabled
- [ ] Early Hints enabled
- [ ] Rocket Loader: Off (conflicts with Astro)

**Caching → Configuration:**
- [ ] Caching Level: Standard
- [ ] Browser Cache TTL: 4 hours

### 6.2 Image Optimization

Cloudflare automatically optimizes images via:
- WebP conversion
- Lazy loading
- Responsive images

No additional configuration needed.

---

## Step 7: SEO Configuration

### 7.1 Submit Sitemap

1. Generate sitemap (automatic in Astro):
   `https://blog.codewithbotina.com/sitemap-index.xml`

2. Submit to Google Search Console:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add property: `blog.codewithbotina.com`
   - Verify ownership (DNS TXT record or HTML file)
   - Submit sitemap: `https://blog.codewithbotina.com/sitemap-index.xml`

3. Submit to Bing Webmaster Tools:
   - Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
   - Add site
   - Submit sitemap

### 7.2 Verify robots.txt

Visit: https://blog.codewithbotina.com/robots.txt

Should contain:
```
User-agent: *
Allow: /

Sitemap: https://blog.codewithbotina.com/sitemap-index.xml
```

### 7.3 Test Structured Data

Use [Google Rich Results Test](https://search.google.com/test/rich-results):
- Test homepage
- Test post detail page
- Verify Schema.org markup is valid

---

## Troubleshooting

### Issue: Build fails with "Module not found"

**Solution:**
1. Check `package.json` dependencies
2. Verify `package-lock.json` is committed
3. Try: `npm ci` locally, then push

### Issue: Environment variables not loading

**Solution:**
1. Verify variables are set in Cloudflare Pages dashboard
2. Ensure variable names start with `PUBLIC_`
3. Redeploy: Deployments → Retry deployment

### Issue: Custom domain not resolving

**Solution:**
```bash
# Check DNS propagation
dig blog.codewithbotina.com

# Should show CNAME to pages.dev
```

Wait 5-10 minutes for DNS propagation.

### Issue: SSL certificate error

**Solution:**
SSL provisioning can take up to 24 hours. Check:
- Cloudflare Pages → Custom domains → SSL status
- If stuck, remove domain and re-add

### Issue: 404 errors on direct URL access

**Solution:**
Astro static builds should work automatically on Cloudflare Pages.
Verify `output: 'static'` in `astro.config.mjs`.

---

## Monitoring & Maintenance

### Analytics (Optional)

Add Cloudflare Web Analytics:
1. Cloudflare Dashboard → Analytics → Web Analytics
2. Create site
3. Copy tracking code
4. Add to `<head>` in BaseLayout.astro

### Uptime Monitoring

Use a service like:
- UptimeRobot (free tier)
- Better Uptime
- Pingdom

Monitor: `https://blog.codewithbotina.com`

### Regular Maintenance

- Update dependencies monthly: `npm update`
- Review Lighthouse scores quarterly
- Check for broken links: use [broken-link-checker](https://github.com/stevenvachon/broken-link-checker)
- Monitor Cloudflare Analytics for traffic patterns

---

## Cost Estimates

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Cloudflare Pages | Unlimited bandwidth | ~50GB/month |
| Cloudflare DNS | Free | Minimal |
| Supabase | 500MB, 2 concurrent | ~50MB |
| Total Monthly Cost | **$0** | Within free tiers |

---

## Next Steps

1. ✅ Deploy frontend to Cloudflare Pages
2. ✅ Configure custom domain (blog.codewithbotina.com)
3. ✅ Test all functionality in production
4. ✅ Submit sitemap to search engines
5. ✅ Set up analytics and monitoring
6. 📝 Start writing blog posts!

---

**Deployment completed! 🚀**

- Frontend: https://blog.codewithbotina.com
- Backend API: https://api.codewithbotina.com
- Portfolio: https://portfolio.codewithbotina.com
