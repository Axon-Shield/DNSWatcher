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
- **DNS Zone Registration**: Users can register email addresses and DNS zones for monitoring
- **Automated Monitoring**: Background task checks SOA records every 5 minutes
- **Change Detection**: Instant alerts when DNS zones change
- **Email Notifications**: Real-time security alerts sent to users
- **Historical Tracking**: Complete audit trail of all DNS checks

## Technology Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Automation**: pg_cron for scheduled tasks
- **Email**: Supabase Edge Functions with SMTP integration
- **Version Control**: GitHub MCP integration

## Architecture
- **Brochureware Homepage**: Educational content about DNS security
- **Registration System**: Simple email + DNS zone registration
- **Background Monitoring**: Automated SOA record checking
- **Notification System**: Email alerts for changes
- **Dashboard**: User management interface (future)

## Security Features
- Row Level Security (RLS) on all database tables
- Input validation with Zod schemas
- Rate limiting and error handling
- Secure API endpoints with proper authorization
- DNS query validation and sanitization

## Development Status
- ✅ Database schema created and secured
- ✅ Edge Functions deployed and active
- ✅ Cron jobs configured (every 5 minutes)
- ✅ Frontend application built and functional
- ✅ Row Level Security implemented
- ✅ Complete application committed to GitHub
- ✅ GitHub MCP integration configured
- ✅ Context-aware development rules established
- ⏳ Email service ready for SMTP integration

## Key Files
- `src/app/page.tsx` - Brochureware homepage
- `src/components/forms/registration-form.tsx` - User registration
- `src/app/api/register/route.ts` - Registration API endpoint
- `src/app/api/cron/dns-monitor/route.ts` - Cron job proxy
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