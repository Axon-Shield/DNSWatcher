# DNSWatcher Project Overview

## Project Description
DNSWatcher is a proof-of-concept web application for DNS security monitoring. It's designed to help users monitor their DNS zones for unauthorized changes and receive instant notifications when SOA records are modified.

## Repository Information
- **Organization**: Axon-Shield
- **Repository**: DNSWatcher
- **URL**: https://github.com/Axon-Shield/DNSWatcher
- **Status**: ✅ Fully deployed and committed to GitHub
- **Branch**: main (production-ready)

## Core Functionality
- **User Registration**: Email + DNS zone registration with email verification
- **User Authentication**: Login system with email + DNS zone authentication
- **Smart Monitoring**: Free tier checks every 60 seconds; Pro supports 60s/30s/15s/1s
- **Intelligent Change Detection**: Smart filtering prevents notification spam
- **Email Notifications**: Real-time security alerts via Supabase Edge Function + Resend SMTP
- **Historical Tracking**: Complete audit trail of all DNS checks
- **Zone Management**: Users can remove and re-enable zones
- **Subscription Tiers**: Free (up to 2 zones) and Pro (unlimited zones)

## Technology Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Next.js API routes + Supabase Edge Functions
- **Database**: Supabase PostgreSQL with Row Level Security
- **Automation**: pg_cron for scheduled tasks (every 30 seconds)
- **Email**: Supabase Edge Functions using Resend SMTP (no direct Resend API in app code)
- **Version Control**: GitHub MCP integration

## Architecture
- **Multi-View Homepage**: Home, login, and dashboard views (auto-routes to dashboard when authenticated)
- **Registration System**: Email + DNS zone registration with verification
- **User Authentication**: Login system with email + DNS zone
- **User Dashboard**: Add new zones, manage multiple zones, filter/view per-zone and history
- **Background Monitoring**: Automated SOA record checking every 30 seconds with smart filtering
- **Notification System**: Email alerts via Supabase Edge Functions
- **Zone Management**: Remove and re-enable zones functionality

## Security Features
- Row Level Security (RLS) on all database tables
- Input validation with Zod schemas
- Rate limiting and error handling
- Secure API endpoints with proper authorization
- DNS query validation and sanitization

## Development Status
- ✅ Database schema created and secured with RLS
- ✅ Edge Functions deployed and active (send-email, dns-monitor)
- ✅ Cron jobs configured and operational (every 30 seconds)
- ✅ Frontend application built and functional
- ✅ User registration and authentication system
- ✅ Email verification flow implemented
- ✅ User dashboard with zone management
- ✅ Zone reactivation functionality
- ✅ Email notifications via Resend API
- ✅ **Smart DNS Monitoring System**: ✅ **FULLY OPERATIONAL** (30-second frequency)
- ✅ **Intelligent Change Detection**: ✅ **VERIFIED** (Smart filtering prevents spam)
- ✅ **SOA Change Detection**: ✅ **VERIFIED** (Serial 2386530407 → 2386530404)
- ✅ **Email Notifications**: ✅ **VERIFIED** (Email ID: 85742c62-110c-4743-8b2c-689978e05d1e)
- ✅ **High-Frequency Cron Job**: ✅ **VERIFIED** (Running every 30 seconds)
- ✅ **Spam Prevention**: ✅ **VERIFIED** (Smart filtering system active)
- ✅ Complete application committed to GitHub
- ✅ GitHub MCP integration configured
- ✅ Context-aware development rules established
- ✅ Context files updated with latest features

## Key Files
- `src/app/page.tsx` - Multi-view homepage (home, login, dashboard)
- `src/components/forms/registration-form.tsx` - User registration with email verification
- `src/components/forms/login-form.tsx` - User authentication
- `src/components/user-dashboard.tsx` - Zone management dashboard
- `src/app/api/register/route.ts` - Registration API with zone reactivation
- `src/app/api/login/route.ts` - Login API endpoint
- `src/app/api/remove-zone/route.ts` - Zone removal API
- OTP-only email verification:
  - `src/app/api/send-verification-email/route.ts` - Generate/store OTP and send via Edge Function
  - `src/app/api/verify-otp/route.ts` - Validate OTP, confirm email, activate zones
- `src/app/api/cron/dns-monitor/route.ts` - DNS monitoring cron job
- `docs/SUPABASE_SETUP.md` - Complete setup guide
- `context/` - AI context files for development
- `.cursorrules` - Context-aware development rules

## GitHub Integration
- **Repository**: https://github.com/Axon-Shield/DNSWatcher
- **Commits**: 7 commits with conventional commit messages
- **Branch Strategy**: main branch for production
- **MCP Integration**: Automatic commits and pull requests
- **Documentation**: Complete setup and development guides

## Future Enhancements
- User authentication and dashboard
- Advanced DNS record monitoring
- Multiple notification channels
- API rate limiting
- Advanced security features
- Monitoring analytics and reporting

## Development Workflow
- **Context-Aware**: Automatic tool selection based on feature type
- **GitHub MCP**: Automatic commits with descriptive messages
- **Supabase MCP**: Database operations and Edge Function deployment
- **Conventional Commits**: Standardized commit message format
- **Documentation**: Always updated with new features