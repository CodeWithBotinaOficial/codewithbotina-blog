# Deployment Guide - CodeWithBotina Backend

Complete guide for deploying the backend to Deno Deploy with custom domain.

## Prerequisites Checklist

- [ ] Deno Deploy account created
- [ ] GitHub repository exists and is public/connected
- [ ] Supabase project created with tables configured
- [ ] Resend account with domain verified
- [ ] Cloudflare account managing codewithbotina.com

## Step 1: Prepare Supabase

### 1.1 Verify Database Tables

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: contacts, posts
```

### 1.2 Configure Row Level Security

```sql
-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all_access"
ON contacts FOR ALL
USING (true)
WITH CHECK (true);
```

### 1.3 Get Credentials

- Go to Supabase Dashboard → Settings → API
- Copy:
  - Project URL: `https://xxxxx.supabase.co`
  - Service Role Key: `eyJhbG...` (secret, never expose)

## Step 2: Configure Resend

### 2.1 Verify Domain

- Ensure `codewithbotina.com` shows "Verified" status
- Test email sending from Resend dashboard

### 2.2 Get API Key

- Go to Resend Dashboard → API Keys
- Create production key with "Sending access"
- Copy key: `re_xxxxx`

## Step 3: Deploy to Deno Deploy

### 3.1 Create Project

1. Go to https://dash.deno.com/projects
2. Click "New Project"
3. Name: `codewithbotina-api`
4. Connect GitHub repository
5. Select branch: `main`
6. Set root directory: `backend/`
7. Entry point: `main.ts`
8. Click "Deploy Project"

### 3.2 Configure Environment Variables

In Deno Deploy Dashboard → Settings → Environment Variables:

| Key                         | Value               | Example                           |
| --------------------------- | ------------------- | --------------------------------- |
| `SUPABASE_URL`              | Your Supabase URL   | `https://xxxxx.supabase.co`       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret | `eyJhbG...`                       |
| `RESEND_API_KEY`            | Resend API key      | `re_xxxxx`                        |
| `RESEND_FROM_EMAIL`         | Sender address      | `noreply@codewithbotina.com`      |
| `RESEND_TO_EMAIL`           | Recipient address   | `support@codewithbotina.com`      |
| `ALLOWED_ORIGIN`            | Frontend URL        | `https://blog.codewithbotina.com` |

### 3.3 Verify Deployment

```bash
curl https://codewithbotina-api.deno.dev/api/health
```

## Step 4: Configure Custom Domain

### 4.1 Add Domain in Deno Deploy

1. Deno Deploy Dashboard → Settings → Domains
2. Click "Add Domain"
3. Enter: `api.codewithbotina.com`
4. Deno will show CNAME record to add

### 4.2 Configure Cloudflare DNS

1. Go to Cloudflare Dashboard → DNS → Records
2. Add new record:
   - Type: `CNAME`
   - Name: `api`
   - Target: `codewithbotina-api.deno.dev` (from Deno Deploy)
   - Proxy status: **DNS only** (gray cloud icon)
   - TTL: Auto
3. Save

### 4.3 Wait for Verification

- DNS propagation: 5-10 minutes
- SSL certificate: Automatic (Deno Deploy handles this)

### 4.4 Verify Custom Domain

```bash
curl https://api.codewithbotina.com/api/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-02-05T...", "version": "1.0.0" }
```

## Step 5: Test Production API

### 5.1 Test Health Endpoint

```bash
curl https://api.codewithbotina.com/api/health
```

### 5.2 Test Contact Endpoint

```bash
curl -X POST https://api.codewithbotina.com/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://blog.codewithbotina.com" \
  -d '{
    "nombre": "Production Test",
    "correo": "test@example.com",
    "mensaje": "Testing production deployment"
  }'
```

### 5.3 Verify Results

1. Check response: Should be `{"success":true,...}`
2. Check email: `support@codewithbotina.com` inbox
3. Check database: Supabase → Table Editor → contacts
4. Check logs: Deno Deploy Dashboard → Logs

## Step 6: Configure Continuous Deployment

Already configured! Every push to `main` branch triggers automatic deployment.

### Workflow:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

Deno Deploy automatically:

1. Pulls latest code
2. Runs build
3. Deploys to edge network
4. Updates https://api.codewithbotina.com

### Monitor Deployment:

- Deno Deploy Dashboard → Deployments tab
- View logs, metrics, and status

## Step 7: Post-Deployment Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Contact endpoint accepts valid requests
- [ ] Email notifications arrive
- [ ] Database records are created
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting works (test with multiple requests)
- [ ] Custom domain resolves correctly
- [ ] SSL certificate is valid (check browser)
- [ ] Documentation page loads at root URL

## Rollback Procedure

If deployment fails:

1. Go to Deno Deploy Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Verify with health check

## Monitoring Setup

### Recommended Services:

1. **Uptime Monitoring:** UptimeRobot (free tier)
   - Monitor: `https://api.codewithbotina.com/api/health`
   - Interval: 5 minutes
   - Alert: Email to support@codewithbotina.com

2. **Log Aggregation:** Deno Deploy built-in logs
   - Access: Dashboard → Logs tab
   - Retention: 7 days

3. **Error Tracking:** (Optional) Sentry or similar
   - Track 500 errors
   - Alert on threshold breach

## Troubleshooting

### Issue: Domain not resolving

**Solution:**

```bash
# Check DNS propagation
dig api.codewithbotina.com

# Should show CNAME to deno.dev
```

### Issue: SSL certificate error

**Solution:** Wait 10-15 minutes for automatic provisioning. Deno Deploy handles
SSL automatically.

### Issue: Environment variables not loading

**Solution:** Verify variables in Deno Deploy dashboard, redeploy if needed.

### Issue: CORS errors in production

**Solution:** Ensure `ALLOWED_ORIGIN=https://blog.codewithbotina.com` (no
trailing slash).

## Cost Estimates (Free Tier Limits)

| Service     | Free Tier           | Usage Expected      |
| ----------- | ------------------- | ------------------- |
| Deno Deploy | 100k requests/month | ~10k/month          |
| Supabase    | 500MB, 2 concurrent | ~50MB, 1 concurrent |
| Resend      | 3,000 emails/month  | ~100/month          |
| Cloudflare  | Unlimited DNS       | Minimal             |

**Total Monthly Cost:** $0 (within free tiers)

## Next Steps

1. Deploy frontend to Cloudflare Pages
2. Connect frontend to production API
3. Set up monitoring and alerts
4. Configure analytics (optional)
5. Plan v2.0 features

---

Deployment completed! 🚀

API: https://api.codewithbotina.com Docs: https://api.codewithbotina.com/ Blog:
https://blog.codewithbotina.com (to be deployed)
