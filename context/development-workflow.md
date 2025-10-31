# Development Workflow Context

## Context-Aware Development Rules
DNSWatcher uses intelligent, context-aware development patterns. Any code change MUST be accompanied by context documentation updates in the `context/` folder in the same commit.

## Repository Status
- **Organization**: Axon-Shield
- **Repository**: DNSWatcher
- **URL**: https://github.com/Axon-Shield/DNSWatcher
- **Status**: ✅ Fully deployed and operational
- **Commits**: 9 commits with conventional commit messages
- **Branch**: main (production-ready)

## Feature Categories and Auto-Actions

### Backend/Server Features
**Keywords**: "backend", "server", "API", "database", "cron", "automation", "edge function"
**Auto-actions**:
1. Use Supabase Edge Functions for all server logic
2. Use Supabase MCP tools for database operations
3. Use pg_cron for scheduled tasks
4. Deploy functions immediately with mcp_supabase_deploy_edge_function
5. Update context files in `context/` folder (MANDATORY)
6. **Git Commit**: Use mcp_github_push_files with descriptive commit message

### Frontend/UI Features  
**Keywords**: "frontend", "UI", "component", "page", "form", "styling", "react"
**Auto-actions**:
1. Create Next.js components in src/components/
2. Use shadcn/ui for UI components
3. Use Tailwind CSS for styling
4. Follow App Router patterns
5. Update context files in `context/` folder (MANDATORY)
6. **Git Commit**: Use mcp_github_push_files with descriptive commit message

### Database/Schema Changes
**Keywords**: "database", "schema", "table", "migration", "RLS", "sql"
**Auto-actions**:
1. Use mcp_supabase_apply_migration for all database changes
2. Never write direct SQL files
3. Always enable RLS on new tables
4. Create proper indexes for performance
5. Update context files in `context/` folder (MANDATORY)
6. **Git Commit**: Use mcp_github_push_files with descriptive commit message

### DNS/Monitoring Features
**Keywords**: "DNS", "monitoring", "SOA", "alert", "notification", "zone"
**Auto-actions**:
1. Update Edge Function logic in dns-monitor function
2. Modify cron job schedules if needed
3. Update monitoring context
4. Test with real DNS queries
5. Update context files in `context/` folder (MANDATORY)
6. **Git Commit**: Use git with descriptive conventional commit message; include updated context files

### Email/Notification Features
**Keywords**: "email", "notification", "alert", "SMTP", "send"
**Auto-actions**:
1. Update send-email Edge Function
2. Integrate with email service providers
3. Test email delivery
4. Update notification context
5. Update context files in context/ folder
6. **Git Commit**: Use mcp_github_push_files with descriptive commit message

## Development Patterns

### Code Organization
- **src/app/**: Next.js App Router pages and API routes
- **src/components/**: Reusable UI components
- **src/lib/**: Utility functions and configurations
- **src/types/**: TypeScript type definitions
- **docs/**: Documentation and setup guides
- **context/**: AI context files for development understanding

### File Naming Conventions
- **Components**: PascalCase (e.g., `RegistrationForm.tsx`)
- **Pages**: lowercase with hyphens (e.g., `page.tsx`)
- **API Routes**: lowercase with hyphens (e.g., `route.ts`)
- **Utilities**: camelCase (e.g., `utils.ts`)
- **Types**: camelCase with descriptive names (e.g., `database.ts`)

### Import Patterns
- **Absolute Imports**: Use `@/` prefix for src/ directory
- **Component Imports**: Import from specific files
- **Type Imports**: Use `type` keyword for type-only imports
- **Library Imports**: Group by source (React, Next.js, third-party)

## Git Workflow

### Commit Message Patterns
- **feat(ui)**: Frontend UI components and pages
- **feat(api)**: Backend API endpoints and Edge Functions
- **feat(db)**: Database schema changes and migrations
- **feat(dns)**: DNS monitoring and SOA detection features
- **feat(email)**: Email notification and alert systems
- **fix(ui)**: Frontend bug fixes
- **fix(api)**: Backend bug fixes
- **fix(db)**: Database bug fixes
- **docs**: Documentation updates
- **refactor**: Code refactoring and cleanup
- **chore**: Maintenance tasks

### Branch Strategy
- **main**: Production-ready code
- **develop**: Development branch for features
- **feature/**: Feature branches (e.g., `feature/user-dashboard`)
- **fix/**: Bug fix branches (e.g., `fix/dns-monitoring-error`)

### Pull Request Workflow
1. **Create feature branch** with descriptive name
2. **Implement feature** with proper commits
3. **Test thoroughly** before submitting PR
4. **Update documentation** if needed
5. **Create pull request** with detailed description
6. **Review and merge** after approval

## Quality Assurance

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured for React and Next.js
- **Prettier**: Code formatting consistency
- **Husky**: Pre-commit hooks for quality
- **Testing**: Unit and integration tests

### Error Handling
- **API Routes**: Proper error responses with status codes
- **Components**: Error boundaries and fallback UI
- **Forms**: Validation errors and user feedback
- **Database**: Transaction handling and rollback
- **Edge Functions**: Comprehensive error logging

### Performance
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component
- **Caching**: Appropriate cache headers and strategies
- **Database**: Optimized queries and indexes
- **CDN**: Supabase CDN for static assets

## Security Practices

### Input Validation
- **Client-side**: Zod schema validation
- **Server-side**: API route validation
- **Database**: RLS policies and constraints
- **Sanitization**: XSS and injection prevention

### Authentication
- **Supabase Auth**: User authentication system
- **API Keys**: Service role key protection
- **Session Management**: Secure session handling
- **Authorization**: Role-based access control

### Data Protection
- **RLS**: Row Level Security on all tables
- **Encryption**: Data encryption in transit and at rest
- **Privacy**: GDPR compliance considerations
- **Audit**: Complete audit trail for all operations

## Monitoring and Debugging

### Logging
- **Edge Functions**: Comprehensive logging for debugging
- **API Routes**: Request/response logging
- **Database**: Query performance monitoring
- **Errors**: Centralized error tracking

### Frontend Debugging (Browser Console)
- **Use Cursor's inbuilt Chrome browser** to inspect runtime issues.
- **Console logs**: Capture via the inbuilt console tool (no external Edge browser needed).
- **Flow**:
  1. Navigate to the deployed URL in the inbuilt browser
  2. Reproduce the issue
  3. Read console messages using the console capture tool
  4. Fix and retest

### Testing
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API and database integration
- **E2E Tests**: Complete user flow testing
- **Performance Tests**: Load and stress testing

### Deployment
- **Edge Functions**: Automatic deployment via Supabase
- **Next.js**: Vercel deployment
- **Database**: Supabase managed PostgreSQL
- **Monitoring**: Real-time monitoring and alerts

## Current Project Status

### Completed Features
- ✅ **Project Setup**: Next.js 14 with TypeScript and Tailwind CSS
- ✅ **UI Components**: Complete shadcn/ui component library
- ✅ **Registration System**: Email and DNS zone registration
- ✅ **Supabase Integration**: Database schema and Edge Functions
- ✅ **DNS Monitoring**: Automated SOA record checking
- ✅ **GitHub Integration**: MCP integration with automatic commits
- ✅ **Documentation**: Complete setup and development guides
- ✅ **Context Files**: AI understanding files for development

### Active Systems
- **Database**: Supabase PostgreSQL with RLS enabled
- **Edge Functions**: dns-monitor and send-email deployed
- **Cron Jobs**: DNS monitoring every 5 minutes
- **GitHub**: Automatic commits and version control
- **Documentation**: Always up-to-date with changes

### Development Workflow
- **Context-Aware**: Automatic tool selection based on feature type
- **GitHub MCP**: Automatic commits with descriptive messages
- **Supabase MCP**: Database operations and Edge Function deployment
- **Conventional Commits**: Standardized commit message format
- **Documentation**: Always updated with new features

## Future Enhancements

### Scalability
- **Microservices**: Break down into smaller services
- **Caching**: Redis for session and data caching
- **CDN**: Global content delivery
- **Load Balancing**: Multiple server instances

### Advanced Features
- **Real-time**: WebSocket integration
- **Analytics**: User behavior tracking
- **AI/ML**: Intelligent threat detection
- **API**: Public API for third-party integrations

### DevOps
- **CI/CD**: Automated testing and deployment
- **Infrastructure**: Infrastructure as Code
- **Monitoring**: Advanced monitoring and alerting
- **Security**: Automated security scanning

## Best Practices Summary

### Development
- **Always use context-aware development rules**
- **Commit with descriptive conventional commit messages**
- **Update documentation and context files with changes**
- **Test thoroughly before committing**
- **Use appropriate MCP tools for each task**

### Collaboration
- **Clear commit history for team understanding**
- **Proper issue tracking for bug management**
- **Effective pull request workflow for code review**
- **Organized repository structure for maintainability**

### Quality
- **Follow TypeScript strict mode**
- **Implement proper error handling**
- **Use security best practices**
- **Maintain comprehensive documentation**
- **Monitor performance and security**