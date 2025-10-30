# Google OAuth Setup Guide - Complete Configuration

## Understanding the OAuth Flow

The OAuth flow works like this:
1. User clicks "Continue with Google" → App redirects to **Supabase OAuth endpoint**
2. Supabase redirects to **Google OAuth**
3. Google redirects back to **Supabase's callback URL** (`https://{project-ref}.supabase.co/auth/v1/callback`)
4. Supabase processes the OAuth and redirects to **YOUR app's callback URL** (`/auth/callback`)
5. Your app processes the code and creates a session

## Step-by-Step Configuration

### Step 1: Get Your URLs

**Your Vercel Production URLs:**
- Main: `https://consuler-git-main-petercheng123321s-projects.vercel.app`
- Preview URLs: Check Vercel dashboard for preview deployments

**Your Supabase Project:**
- Go to Supabase Dashboard → Settings → API
- Find your **Project URL**: `https://{project-ref}.supabase.co`

### Step 2: Configure Supabase Dashboard

#### A. Site URL Configuration

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to your main production URL:
   ```
   https://consuler-git-main-petercheng123321s-projects.vercel.app
   ```

#### B. Redirect URLs (Where Supabase redirects AFTER OAuth)

In the same **URL Configuration** section, add these **Redirect URLs**:

```
https://consuler-git-main-petercheng123321s-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

**Important:** If you have preview deployments, you can add them too, OR use a wildcard pattern (if Supabase supports it):
```
https://consuler-*-petercheng123321s-projects.vercel.app/auth/callback
```

#### C. Configure Google Provider

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. **Enable** the Google provider
3. You'll need to add **Client ID** and **Client Secret** from Google Cloud Console (see Step 3 below)

### Step 3: Configure Google Cloud Console

**IMPORTANT:** Google Cloud Console needs **Supabase's callback URL**, NOT your app's callback URL!

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Create or select your **OAuth 2.0 Client ID**
4. Add **Authorized redirect URIs**:
   ```
   https://{your-project-ref}.supabase.co/auth/v1/callback
   ```
   
   **Example:**
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```
   
   Replace `{your-project-ref}` with your actual Supabase project reference (found in Supabase Dashboard → Settings → API → Project URL)

5. Copy the **Client ID** and **Client Secret**
6. Paste them into **Supabase Dashboard** → **Authentication** → **Providers** → **Google**

### Step 4: Verify Configuration

1. **Check Supabase Site URL:**
   - Should be: `https://consuler-git-main-petercheng123321s-projects.vercel.app`

2. **Check Supabase Redirect URLs:**
   - Should include: `https://consuler-git-main-petercheng123321s-projects.vercel.app/auth/callback`
   - Should include: `http://localhost:3000/auth/callback`

3. **Check Google Cloud Console Redirect URIs:**
   - Should be: `https://{project-ref}.supabase.co/auth/v1/callback`
   - **NOT** your app's callback URL!

4. **Test the Flow:**
   - Open your Vercel site
   - Open browser console (F12)
   - Click "Continue with Google"
   - Check console logs:
     - `OAuth redirect URL:` should show your Vercel URL
     - `Supabase redirect URL:` should show Supabase's OAuth URL

## Common Issues & Solutions

### Issue: "Redirect URI mismatch"

**Symptoms:** Google shows an error about redirect URI not matching

**Solution:**
- Make sure Google Cloud Console has **Supabase's callback URL** (`https://{project-ref}.supabase.co/auth/v1/callback`)
- Do NOT add your app's callback URL to Google Cloud Console

### Issue: "Redirect URL not allowed"

**Symptoms:** Supabase error about redirect URL not being in allowed list

**Solution:**
- Add your app's callback URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- Make sure it matches exactly (including `https://` vs `http://`)

### Issue: Multiple Preview Deployments

**Problem:** Vercel creates new URLs for each preview deployment

**Solutions:**

**Option 1: Add Each Preview URL**
- Add each preview URL to Supabase Redirect URLs as they're created
- Not ideal for many previews

**Option 2: Use Custom Domain (Recommended)**
- Set up a custom domain in Vercel
- Use one stable URL for production
- Add only that URL to Supabase

**Option 3: Use Environment-Specific Configuration**
- Have different Supabase projects for dev/staging/prod
- Or use Supabase's wildcard support if available

## Code Configuration

The code automatically detects the current domain:
- In production: Uses `window.location.origin` (your Vercel URL)
- In development: Uses `http://localhost:3000`

No code changes needed - just ensure Supabase is configured correctly!

## Testing Checklist

- [ ] Site URL set in Supabase Dashboard
- [ ] Redirect URLs added in Supabase Dashboard (including `/auth/callback`)
- [ ] Google provider enabled in Supabase
- [ ] Google Cloud Console has Supabase callback URL (`https://{project-ref}.supabase.co/auth/v1/callback`)
- [ ] Client ID and Secret configured in Supabase
- [ ] Test login flow works on production
- [ ] Test login flow works on localhost

## Quick Reference

**Supabase Redirect URLs (where Supabase redirects TO):**
```
https://consuler-git-main-petercheng123321s-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

**Google Cloud Console Redirect URI (where Google redirects TO):**
```
https://{your-project-ref}.supabase.co/auth/v1/callback
```

**Flow Diagram:**
```
App → Supabase OAuth → Google OAuth → Supabase Callback → App Callback (/auth/callback)
```
