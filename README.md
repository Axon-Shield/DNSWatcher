# DNSWatcher 🛡️

A DNS security monitoring application that tracks SOA record changes and sends instant email notifications when unauthorized modifications are detected.

## 🚀 Quick Start

1. **Clone and install**:
   ```bash
   git clone https://github.com/Axon-Shield/DNSWatcher.git
   cd DNSWatcher
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.template .env.local
   # Update .env.local with your Supabase service role key
   ```

3. **Start development**:
   ```bash
   npm run dev
   ```

4. **Open browser**: http://localhost:3000

## 📚 Documentation

- **[Setup Guide](docs/SUPABASE_SETUP.md)** - Complete Supabase integration guide
- **[README](docs/README.md)** - Detailed project documentation
- **[Database Schema](docs/supabase-schema.sql)** - SQL schema reference

## 🏗️ Architecture

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL with RLS
- **Automation**: pg_cron for scheduled monitoring
- **UI**: shadcn/ui + Tailwind CSS

## ✨ Features

- ✅ **DNS Zone Registration** - Register domains for monitoring
- ✅ **Automated Monitoring** - SOA records checked every 5 minutes
- ✅ **Change Detection** - Instant alerts on unauthorized changes
- ✅ **Email Notifications** - Real-time security alerts
- ✅ **Historical Tracking** - Complete audit trail
- ✅ **Secure by Design** - Row Level Security + authentication

## 🔧 Development

The project uses context-aware development patterns. See [context/](context/) folder for detailed development guidelines.

**Backend features** → Supabase Edge Functions  
**Frontend features** → Next.js components  
**Database changes** → Supabase MCP migrations  
**DNS monitoring** → pg_cron automation  

## 📊 Status

- ✅ Database schema created and secured
- ✅ Edge Functions deployed and active
- ✅ Cron jobs configured (every 5 minutes)
- ✅ Frontend application built and functional
- ✅ Row Level Security implemented
- ⏳ Email service ready for SMTP integration

## 🛡️ Security

This application implements enterprise-grade security:
- Row Level Security (RLS) on all database tables
- Input validation with Zod schemas
- Rate limiting and error handling
- Secure API endpoints with proper authorization
- DNS query validation and sanitization

---

**DNSWatcher** - Protecting your domains, one DNS record at a time.