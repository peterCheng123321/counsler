# Google OAuth Setup Guide

## Problem: Redirecting to localhost instead of Vercel URL

The code automatically uses `window.location.origin`, which will be your Vercel URL in production. However, Supabase validates redirect URLs against its configured list.

## Solution: Configure Supabase Dashboard

### Step 1: Get Your Vercel URLs

Your current production URLs:
- `https://consuler-ixqbi92ml-petercheng123321s-projects.vercel.app`
- `https://consuler-ibx0y0u0n-petercheng123321s-projects.vercel.app`
- `https://consuler-9l7l2fjzd-petercheng123321s-projects.vercel.app`

(Check your Vercel dashboard for the latest production URL)

### Step 2: Configure Supabase Redirect URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add these **Redirect URLs**:
   ```
   https://consuler-ixqbi92ml-petercheng123321s-projects.vercel.app/auth/callback
   https://consuler-ibx0y0u0n-petercheng123321s-projects.vercel.app/auth/callback
   https://consuler-9l7l2fjzd-petercheng123321s-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

3. Go to **Authentication** → **Providers** → **Google**
4. Enable Google provider
5. Add the same redirect URLs in the **Authorized redirect URIs** section

### Step 3: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (or edit existing)
4. Add **Authorized redirect URIs**:
   ```
   https://consuler-ixqbi92ml-petercheng123321s-projects.vercel.app/auth/callback
   https://consuler-ibx0y0u0n-petercheng123321s-projects.vercel.app/auth/callback
   https://consuler-9l7l2fjzd-petercheng123321s-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
5. Copy **Client ID** and **Client Secret** to Supabase Google provider settings

### Step 4: Verify Configuration

1. Open browser console (F12) on your Vercel site
2. Click "Continue with Google"
3. Check the console logs - you should see:
   - `OAuth redirect URL: https://your-vercel-url/auth/callback`
   - `Supabase redirect URL: https://...` (should match your Vercel URL)

If you see `localhost` in the logs, there's a code issue. If you see the Vercel URL but still get redirected to localhost, it's a Supabase configuration issue.

## Debugging

Check browser console for:
- `OAuth redirect URL:` - Should show Vercel URL in production
- `Supabase redirect URL:` - Should show Supabase OAuth URL with your callback

If redirects still go to localhost:
1. Clear browser cache and cookies
2. Verify Supabase redirect URLs match exactly (including https/http)
3. Check that Google OAuth credentials have the correct redirect URIs

## Automatic Detection

The code automatically detects the current domain:
- `window.location.origin` = Vercel URL on production
- `window.location.origin` = `http://localhost:3000` in development

No code changes needed - just ensure Supabase is configured correctly!

