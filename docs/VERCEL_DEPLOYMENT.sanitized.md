# Vercel Deployment Guide

## Environment Variables Required

### 1. Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Email Configuration
```bash
RESEND_SMTP_CONFIGURED_IN_SUPABASE=true
```

### 3. Site URL
```bash
NEXT_PUBLIC_SITE_URL=https://your-vercel-app-name.vercel.app
```

## Setting Environment Variables in Vercel

### Method 1: Vercel Dashboard
1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the sidebar
4. Add each variable with these settings:
   - **Name**: The environment variable name
   - **Value**: The actual value
   - **Environment**: Select **Production**, **Preview**, and **Development**

### Method 2: Vercel CLI
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add NEXT_PUBLIC_SITE_URL
```

## Important Configuration Notes

### Resend API Key
- Replace `your_actual_resend_api_key_here` with your actual Resend API key
- Get it from [Resend Dashboard](https://resend.com/api-keys)
- Ensure your Resend account is configured to send from `dnswatcher@axonshield.com`

### Site URL
- Replace `https://your-vercel-app-name.vercel.app` with your actual Vercel domain
- Used for redirects (auto-login and dashboard)
- Must match your deployed Vercel URL exactly

### Service Role Key
- Store securely in Vercel; never commit to git
- Used for server-side operations that bypass RLS
- Never expose in client-side code

## Deployment Checklist

- [ ] Set all 5 environment variables in Vercel
- [ ] Verify Resend API key is valid and active
- [ ] Update `NEXT_PUBLIC_SITE_URL` to your Vercel domain
- [ ] Ensure Resend domain is configured for `axonshield.com`
- [ ] Test email sending after deployment
- [ ] Verify Supabase Edge Functions are deployed
- [ ] Test DNS monitoring functionality
- [ ] Test user registration and login flows

## Post-Deployment Testing

### 1. Test User Registration
- Register a new user with email and DNS zone
- Verify password setup flow works
- Check email verification process
- Confirm auto-login after verification

### 2. Test Email Functionality
- Send verification emails
- Test password reset emails
- Verify DNS change notification emails

### 3. Test DNS Monitoring
- Add a DNS zone for monitoring
- Verify cron job is running (every 30 seconds)
- Test SOA change detection
- Confirm email notifications are sent

### 4. Test Authentication
- Login with email/password
- Test forgot password functionality
- Verify session management
- Test logout functionality

## Troubleshooting

### Common Issues
1. **Email not sending**: Check Resend API key and domain configuration
2. **Authentication errors**: Verify Supabase keys are correct
3. **DNS monitoring not working**: Check Edge Functions are deployed
4. **Rate limit errors**: Ensure Resend is configured properly

### Support
- Check Vercel function logs for API errors
- Monitor Supabase logs for database issues
- Verify environment variables are set correctly
- Test locally first before deploying

## Security Considerations

- Never commit environment variables to git
- Use Vercel's environment variable system
- Keep service role key secure
- Monitor for unauthorized access
- Regular security audits recommended
