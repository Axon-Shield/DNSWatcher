# Frontend Application Context

## Next.js 14 App Router Structure
DNSWatcher uses Next.js 14 with the App Router for modern React development patterns.

## Core Pages
### Homepage (`src/app/page.tsx`)
- **Purpose**: Multi-view application with routing between home, login, and dashboard
- **Content**: Hero section, features grid, registration form, login form, user dashboard
- **Styling**: Tailwind CSS with gradient backgrounds
- **Components**: Shield, Eye, AlertTriangle, Mail, LogIn icons from Lucide React
- **State Management**: `currentView` state for routing between views
- **Features**: 
  - Registration form with email verification flow
  - Login form for existing users
  - User dashboard with zone management
  - Zone removal with proper state management

### Layout (`src/app/layout.tsx`)
- **Font**: Inter font from Google Fonts
- **Metadata**: SEO-optimized title and description
- **Structure**: Root layout with global CSS

## UI Components
### shadcn/ui Components
- **Button**: Variants (default, outline, ghost, link, destructive) and sizes
- **Input**: Styled input with focus states
- **Card**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Label**: Accessible labels using Radix UI
- **Badge**: Subscription tier display (Free/Pro)
- **Alert**: Success messages and upgrade prompts

### Registration Form (`src/components/forms/registration-form.tsx`)
- **Validation**: React Hook Form + Zod schema
- **States**: Loading, success, error handling, email verification flow
- **API Integration**: POST to `/api/register`
- **User Feedback**: Success animation, error messages, reactivation feedback
- **Email Verification**: Multi-step flow with verification status checking
- **Zone Reactivation**: Handles re-enabling soft-deleted zones
- **Features**:
  - Email confirmation required for new users
  - Automatic reactivation for existing soft-deleted zones
  - Different success messages for new vs reactivated zones

### Login Form (`src/components/forms/login-form.tsx`)
- **Purpose**: Authenticate existing users with email + DNS zone
- **Validation**: React Hook Form + Zod schema
- **API Integration**: POST to `/api/login`
- **Features**: Returns user data, zones, and SOA history

### User Dashboard (`src/components/user-dashboard.tsx`)
- **Purpose**: Display user's monitoring dashboard
- **Features**:
  - User subscription tier display (Free/Pro)
  - Current zone monitoring status
  - SOA change history with timestamps
  - Zone removal functionality
  - Success feedback for zone operations
- **State Management**: Loading states, success messages
- **API Integration**: DELETE to `/api/remove-zone`

## Styling System
### Tailwind CSS Configuration
- **Theme**: Custom color palette with CSS variables
- **Dark Mode**: Built-in dark mode support
- **Components**: shadcn/ui component styling
- **Responsive**: Mobile-first responsive design

### Global Styles (`src/app/globals.css`)
- **CSS Variables**: Theme colors and spacing
- **Base Styles**: Reset and typography
- **Component Classes**: Utility classes for common patterns

## State Management
- **React Hooks**: useState, useEffect for local state
- **Form State**: React Hook Form for form management
- **API State**: Loading, error, success states
- **No Global State**: Simple local state management

## API Integration
### Registration API (`/api/register`)
- **Method**: POST
- **Payload**: `{ email: string, dnsZone: string }`
- **Response**: Success message with zone ID, reactivation status
- **Features**:
  - Email confirmation flow for new users
  - Zone reactivation for soft-deleted zones
  - Subscription tier enforcement (1 zone for free users)
  - Initial SOA record fetching
- **Error Handling**: Zod validation errors, server errors, zone limits

### Login API (`/api/login`)
- **Method**: POST
- **Payload**: `{ email: string, dnsZone: string }`
- **Response**: User data, current zone, zone history, all zones
- **Features**: Email verification check, zone validation

### Remove Zone API (`/api/remove-zone`)
- **Method**: DELETE
- **Payload**: `{ email: string, zoneId: string }`
- **Response**: Success message with zone name
- **Features**: Soft delete (sets `is_active: false`)

### Email Verification API (`/api/verify-email`)
- **Method**: POST
- **Payload**: `{ token: string, email: string }`
- **Response**: Verification success/failure
- **Features**: Activates zones after email confirmation

### Verification Status API (`/api/check-verification-status`)
- **Method**: GET
- **Query**: `?email={email}`
- **Response**: Verification status
- **Features**: Check if user has verified email

### Cron API (`/api/cron/dns-monitor`)
- **Purpose**: DNS monitoring automation
- **Authentication**: Service role key
- **Features**: 
  - Checks all active zones every minute
  - Detects SOA changes
  - Sends email notifications
  - Records zone checks

## TypeScript Integration
### Type Definitions (`src/types/database.ts`)
- **User**: User account and preferences
- **DNSZone**: Monitored DNS zones
- **ZoneCheck**: Historical check records
- **Notification**: Sent notifications

### Component Props
- **Interface Definitions**: Proper TypeScript interfaces
- **Generic Types**: Reusable component types
- **API Types**: Request/response type safety

## Development Patterns
### Component Structure
- **Functional Components**: Modern React patterns
- **Custom Hooks**: Reusable logic extraction
- **Props Interface**: TypeScript prop definitions
- **Error Boundaries**: Proper error handling

### Form Handling
- **React Hook Form**: Efficient form management
- **Zod Validation**: Runtime type checking
- **Error Display**: User-friendly error messages
- **Loading States**: Visual feedback during submission

## Accessibility
### ARIA Labels
- **Form Labels**: Proper label associations
- **Button States**: Loading and disabled states
- **Error Messages**: Screen reader accessible
- **Focus Management**: Keyboard navigation

### Semantic HTML
- **Form Elements**: Proper form structure
- **Headings**: Logical heading hierarchy
- **Landmarks**: Navigation and main content areas
- **Alt Text**: Image descriptions

## Performance
### Code Splitting
- **Dynamic Imports**: Lazy loading where appropriate
- **Bundle Optimization**: Next.js automatic optimization
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Google Fonts optimization

### Caching
- **Static Generation**: Pre-rendered pages
- **API Caching**: Appropriate cache headers
- **Client Caching**: React Query for API data
- **CDN**: Supabase CDN for assets

## Security
### Input Validation
- **Client-side**: Zod schema validation
- **Server-side**: API route validation
- **Sanitization**: XSS prevention
- **CSRF**: Next.js built-in protection

### Authentication
- **Supabase Auth**: Ready for user authentication
- **Session Management**: Server-side session handling
- **Protected Routes**: Route protection patterns
- **API Security**: Service role key protection

## Future Enhancements
### Dashboard
- **User Dashboard**: Zone management interface
- **Monitoring Status**: Real-time monitoring display
- **Historical Data**: Charts and analytics
- **Settings**: User preferences management

### Advanced Features
- **Real-time Updates**: WebSocket integration
- **Push Notifications**: Browser notifications
- **Mobile App**: React Native or PWA
- **API Documentation**: Interactive API docs

## Testing
### Unit Tests
- **Component Testing**: React Testing Library
- **Utility Functions**: Jest testing
- **API Routes**: API testing
- **Type Safety**: TypeScript compilation

### Integration Tests
- **E2E Testing**: Playwright or Cypress
- **API Integration**: Full flow testing
- **Database Integration**: Supabase testing
- **User Flows**: Complete user journeys