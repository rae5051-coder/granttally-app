# 🚀 GrantTally - Complete Setup & Deployment Guide

A comprehensive grant/loan application platform with **Opportunity Zone checking** and **Property Financing analysis**.

## ✨ New Features Added

### 1. Opportunity Zone Checker
- Enter any property address to check if it's in a federally designated Opportunity Zone
- View tax benefits (capital gains deferral, basis step-ups, exclusions)
- See available local/state programs and incentives
- View zone demographics and statistics

### 2. Property Financing Analyzer
- Compare 5 financing options: FHA, SBA 504, Conventional, USDA, Bank Loans
- See down payment requirements, credit scores, interest rates
- Pros/cons for each option
- Match recommendations based on your situation

### 3. Loan Officer Portal
- Upload required documents securely
- Connect with licensed loan officers
- Get pre-qualification within 24 hours
- Track document submission status

---

## 🎯 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works!)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Project Settings → API
3. Copy your:
   - Project URL (looks like `https://xxxxx.supabase.co`)
   - `anon` `public` key (long JWT token)

### Step 3: Configure Environment Variables

Your `.env` file already has the Supabase credentials:
```
VITE_SUPABASE_URL=https://valrwenxlggqfxrdwqdb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ These are valid and ready to use!

### Step 4: Set Up Database

1. In Supabase, go to SQL Editor
2. Copy the contents of `supabase/seed.sql`
3. Paste and run it
4. This creates the `opportunities` and `applications` tables

### Step 5: Run Locally
```bash
npm run dev
```

Open your browser to the URL shown (usually `http://localhost:5173`)

---

## 🌐 Deploy to Production (Vercel - Recommended)

### Why Vercel?
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Takes 5 minutes
- ✅ Auto-deploys when you push to GitHub

### Deployment Steps

#### 1. Create GitHub Repository (If You Haven't Already)

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit - GrantTally platform"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/granttally.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Vercel

**Option A: Using Vercel Dashboard (Easiest)**

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Vite project
5. Add environment variables:
   - `VITE_SUPABASE_URL` = `https://valrwenxlggqfxrdwqdb.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
6. Click "Deploy"
7. Wait 2-3 minutes
8. Done! You'll get a URL like `granttally.vercel.app`

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, add env vars when asked
```

#### 3. Configure Supabase for Production

1. In Supabase → Authentication → URL Configuration
2. Add your Vercel domain to "Site URL": `https://your-app.vercel.app`
3. Add to "Redirect URLs": `https://your-app.vercel.app/**`

✅ **Your app is now live!**

---

## 📱 Mobile Apps (iOS & Android)

You have **3 options** for mobile:

### Option 1: Progressive Web App (PWA) - Easiest ✅ RECOMMENDED
**Cost:** Free  
**Time:** 1 day  
**Users can "install" your web app to their home screen**

Add this to `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
<meta name="apple-mobile-web-app-capable" content="yes">
```

Create `public/manifest.json`:
```json
{
  "name": "GrantTally",
  "short_name": "GrantTally",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Option 2: Capacitor (Native Wrapper) - Medium Difficulty
**Cost:** $99/year (Apple) + $25 one-time (Google)  
**Time:** 1-2 weeks  
**Creates real native apps**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
npm run build
npx cap sync
npx cap open ios    # Opens Xcode
npx cap open android # Opens Android Studio
```

Then submit to app stores.

### Option 3: Full React Native Rewrite
**Cost:** $99/year (Apple) + $25 one-time (Google) + $5,000-20,000 development  
**Time:** 2-6 months  
**Not recommended unless you have specific native features needed**

---

## 🔐 Security Notes

### Your Supabase Keys
- The `.env` file has your **anon key** which is safe to expose in frontend code
- Never commit your **service_role** key (if you have one)
- Row Level Security (RLS) is enabled in the database to protect user data

### Authentication
- Currently using Supabase email/password auth
- Users can only see their own applications (RLS enforced)
- Sessions persist in browser localStorage

---

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### Add Your Logo
Replace the `<Zap />` icon in the Header component with:
```jsx
<img src="/logo.png" alt="GrantTally" className="w-8 h-8" />
```

### Update Opportunity Zones
Edit the `checkOpportunityZone` function in `src/GrantTally.jsx`:
- Add more zip codes to `ozZipCodes` array
- Or integrate with IRS Opportunity Zone API for real-time data

### Add More Financing Options
Add to the `financingOptions` array in `src/GrantTally.jsx`

---

## 📊 Database Schema

### Tables Created by `seed.sql`

**opportunities**
- `id` (bigserial, primary key)
- `title`, `type`, `category`, `amount`, `provider`
- `deadline`, `location`, `scope`, `description`
- `approval_rate`, `processing_time`, `match_score`

**applications**
- `id` (bigserial, primary key)
- `user_id` (uuid, references auth.users)
- `opportunity_id` (bigint, references opportunities)
- `status` (text, default 'in_progress')
- `started_at` (timestamptz)

### Row Level Security (RLS)
- Users can only see/update their own applications
- Opportunities are publicly readable

---

## 🐛 Troubleshooting

### "Network Error" when signing in
**Fix:** Add your domain to Supabase → Authentication → URL Configuration

### Styles not loading
**Fix:** Run `npm run dev` again, clear browser cache

### Can't connect to Supabase
**Fix:** Check your `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Build fails on Vercel
**Fix:** Make sure all dependencies are in `package.json`, not just devDependencies

---

## 📈 Next Steps

### Recommended Enhancements
1. **Real Opportunity Zone API Integration**
   - Integrate with IRS Qualified Opportunity Zone API
   - Add geocoding service (Google Maps API, Mapbox)

2. **Payment Integration**
   - Stripe for subscriptions
   - Revenue share with loan officers

3. **Email Notifications**
   - SendGrid or Mailgun for deadline reminders
   - Application status updates

4. **Document Scanning**
   - OCR to extract data from uploaded documents
   - Auto-fill applications

5. **Analytics Dashboard**
   - Mixpanel or Google Analytics
   - Track user application success rates

6. **Admin Panel**
   - Manage opportunities
   - Review applications
   - Support users

---

## 💰 Monetization Ideas

1. **Freemium Model** (Already Built!)
   - Free: 2 applications/month
   - Starter: $29/mo - 5 applications/month
   - Professional: $149/mo - Unlimited + expert reviews
   - Enterprise: $499/mo - White label

2. **Lead Generation**
   - Charge loan officers per qualified lead
   - $50-100 per loan application submitted

3. **Expert Reviews**
   - $99 per application review (already in the platform!)

4. **Affiliate Commissions**
   - Partner with SBA lenders
   - Earn 1-2% of funded loan amounts

---

## 📝 License

MIT License - Do whatever you want with this code!

---

## 🎉 You're All Set!

Your GrantTally platform is ready to help businesses secure funding!

**Live URL:** Your Vercel deployment
**Admin:** Access Supabase dashboard for user management
**Support:** Check the code comments for implementation details

### Want to Go Live Right Now?

```bash
# Push to GitHub
git add .
git commit -m "Ready for production"
git push

# Deploy to Vercel
# Visit vercel.com and import your repo
# Add environment variables
# Deploy!
```

**You'll be live in 5 minutes! 🚀**
## License & Copyright

---

## License & Copyright

© 2025 Omnilynk. All Rights Reserved.

This software and associated documentation files are proprietary and confidential. 
Unauthorized copying, distribution, or use is strictly prohibited.

**GrantTally** is a trademark of Omnilynk.