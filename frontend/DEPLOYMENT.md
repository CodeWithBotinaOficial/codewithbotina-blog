# Deployment Guide - CodeWithBotina Frontend

Complete guide for deploying the frontend to Cloudflare Pages with custom domain (as of 2026).

---

## Prerequisites Checklist

- [ ] GitHub repository exists and is connected to Cloudflare.
- [ ] Supabase project created with a `posts` table.
- [ ] Backend API is deployed and live at `api.codewithbotina.com`.
- [ ] Cloudflare account is managing the `codewithbotina.com` domain.
- [ ] All required environment variables are documented and ready.

---

## Step 1: Prepare for Deployment

### 1.1 Verify Build Works Locally

```bash
cd frontend
npm run build
npm run preview
```

Access `http://localhost:4321` and verify:
- All pages load correctly.
- Search functionality works as expected.
- Contact form submits successfully.
- Images and assets load without errors.
- No console errors are present.

### 1.2 Verify Environment Variables

Ensure your local `.env` file contains the correct production values for testing the build:
```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
PUBLIC_API_URL=https://api.codewithbotina.com
PUBLIC_SITE_URL=https://blog.codewithbotina.com
```

### 1.3 Run Tests

```bash
npm run test
npm run test:coverage
```

Ensure all tests pass with adequate coverage before deploying.

---

## Step 2: Configure Cloudflare Pages (2026 UI)

### 2.1 Create New Project

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **Workers & Pages** → **Create application** → **Pages** tab.
3. Click **"Connect to Git"** and select your `codewithbotina-blog` repository.
4. Click **"Begin setup"**.

### 2.2 Configure Build Settings

**Project Name:** `codewithbotina-blog`

**Build Configuration:**
- **Framework preset:** `Astro`
- **Build command:** `npm run build`
- **Build output directory:** `/dist`
- **Root directory:** `/frontend`

**Advanced Settings:**
- **Node.js version:** `22.x` (or latest compatible)
- **Environment variables:** (see next step)

### 2.3 Add Environment Variables

In your Cloudflare Pages project, go to **Settings** → **Environment Variables**:

**Production Environment:**

| Variable Name | Value |
|---------------|-------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase public anon key |
| `PUBLIC_API_URL` | `https://api.codewithbotina.com` |
| `PUBLIC_SITE_URL` | `https://blog.codewithbotina.com` |
| `PUBLIC_SITE_NAME` | `CodeWithBotina` |
| `PUBLIC_SITE_DESCRIPTION`| `Technical blog...` |
| `PUBLIC_AUTHOR_NAME` | `Diego Alejandro Botina` |
| `PUBLIC_AUTHOR_EMAIL` | `support@codewithbotina.com` |
| `PUBLIC_AUTHOR_URL` | `https://portfolio.codewithbotina.com` |

**Social Media Variables:**
- Add all `PUBLIC_..._URL` variables from your `.env.example` file.

Click **"Save and Deploy"**.

---

## Step 3: Configure Custom Domain

### 3.1 Wait for Initial Deployment

Cloudflare will deploy your site to a unique `.pages.dev` URL. Wait for this to complete.

### 3.2 Add Custom Domain

1. In your Cloudflare Pages project, go to the **Custom domains** tab.
2. Click **"Set up a custom domain"**.
3. Enter `blog.codewithbotina.com` and click **"Continue"**.

Cloudflare will automatically create the necessary DNS record and provision an SSL certificate.

### 3.3 Verify DNS Configuration

Go to your Cloudflare DNS settings. A `CNAME` record for `blog` pointing to your `.pages.dev` URL should be present with the proxy status **enabled** (orange cloud).

---

## Step 4: Post-Deployment Verification

- **Test All Pages:** Navigate through the live site to ensure all pages work.
- **Test Search:** Use the search bar to filter posts.
- **Test Contact Form:** Submit a test message and verify you receive the email and the data is in Supabase.
- **Run Lighthouse Audit:** Check Performance, Accessibility, Best Practices, and SEO scores.

---

## Step 5: Continuous Deployment

Every push to the `main` branch will automatically trigger a new deployment. Monitor status in the Cloudflare Pages dashboard.

**Rollback Procedure:**
If a deployment fails, go to the **Deployments** tab, find the last successful build, and click **"Rollback to this deployment"**.

---

## Step 6: Performance & SEO

### Cloudflare Settings
- **Speed → Optimization:** Enable Auto Minify (HTML, CSS, JS) and Brotli.
- **Caching → Configuration:** Set Browser Cache TTL to `4 hours` or higher.

### SEO
- **Submit Sitemap:** Add `https://blog.codewithbotina.com/sitemap-index.xml` to Google Search Console and Bing Webmaster Tools.
- **Verify `robots.txt`:** Check that `https://blog.codewithbotina.com/robots.txt` is correct.

---

## Troubleshooting (2026)

- **Build Fails:** Check Node.js version compatibility in Cloudflare settings. Ensure `package-lock.json` is up-to-date.
- **Environment Variables Not Loading:** Ensure variables are not set to "Secret" in the Cloudflare UI. Redeploy after adding variables.
- **404 Errors on Refresh:** Verify `output: 'static'` is set in `astro.config.mjs`.

---

**Deployment completed! 🚀**
