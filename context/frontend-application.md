# Frontend Application Context

## Next.js 14 App Router Structure
DNSWatcher uses Next.js 14 with the App Router for modern React development patterns.

## Core Pages
### Homepage (`src/app/page.tsx`)
- **Purpose**: Brochureware explaining DNS security
- **Content**: Hero section, features grid, registration form
- **Styling**: Tailwind CSS with gradient backgrounds
- **Components**: Shield, Eye, AlertTriangle, Mail icons from Lucide React

### Layout (`src/app/layout.tsx`)
- **Font**: Inter font from Google Fonts
- **Metadata**: SEO-optimized title and description
- **Structure**: Root layout with global CSS

## UI Components
### shadcn/ui Components
- **Button**: Variants (default, outline, ghost, link) and sizes
- **Input**: Styled input with focus states
- **Card**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Label**: Accessible labels using Radix UI

### Registration Form (`src/components/forms/registration-form.tsx`)
- **Validation**: React Hook Form + Zod schema
- **States**: Loading, success, error handling
- **API Integration**: POST to `/api/register`
- **User Feedback**: Success animation, error messages

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
### Registration API
- **Endpoint**: `/api/register`
- **Method**: POST
- **Payload**: `{ email: string, dnsZone: string }`
- **Response**: Success message with zone ID
- **Error Handling**: Zod validation errors, server errors

### Cron API
- **Endpoint**: `/api/cron/dns-monitor`
- **Purpose**: Proxy to Supabase Edge Functions
- **Authentication**: Service role key
- **Testing**: GET requests for manual testing

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