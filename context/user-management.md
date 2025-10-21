# User Management and Authentication Context

## User Registration Flow
### Multi-Step Registration Process
1. **Form Submission**: User enters email and DNS zone
2. **Email Verification**: New users receive confirmation email
3. **Zone Activation**: Zones activated only after email verification
4. **Monitoring Start**: DNS monitoring begins after verification

### Registration API (`/api/register`)
- **Input Validation**: Zod schema validation
- **User Creation**: Creates user with confirmation token
- **Zone Management**: Handles both new zones and reactivation
- **Subscription Limits**: Enforces 1 zone limit for free users
- **Email Confirmation**: Generates UUID confirmation token

## Email Verification System
### Verification Process
- **Token Generation**: UUID-based confirmation tokens
- **Email Sending**: Confirmation emails sent to new users
- **Status Tracking**: `email_confirmed` boolean field
- **Zone Activation**: Zones become active after verification

### Verification API (`/api/verify-email`)
- **Token Validation**: Validates confirmation token
- **Email Confirmation**: Updates `email_confirmed` status
- **Zone Activation**: Activates associated DNS zones
- **Token Cleanup**: Clears used confirmation tokens

### Verification Status API (`/api/check-verification-status`)
- **Status Check**: Returns verification status for user
- **Frontend Integration**: Used by registration form for status updates

## User Authentication
### Login System
- **Email + Zone Authentication**: Users login with email and specific DNS zone
- **Zone Validation**: Verifies zone belongs to user and is active
- **Dashboard Access**: Returns user data, zones, and SOA history

### Login API (`/api/login`)
- **Input**: `{ email: string, dnsZone: string }`
- **Validation**: Checks email verification status
- **Response**: User data, current zone, zone history, all zones
- **Error Handling**: Proper error messages for invalid credentials

## Subscription Management
### Subscription Tiers
- **Free Tier**: 1 DNS zone limit
- **Pro Tier**: Unlimited DNS zones
- **Upgrade Prompts**: UI prompts for free users to upgrade

### Zone Limits
- **Enforcement**: API checks active zone count
- **Error Messages**: Clear messages about zone limits
- **Upgrade Required**: Flag for frontend upgrade prompts

## Zone Management
### Zone Lifecycle
1. **Creation**: New zones created during registration
2. **Activation**: Zones activated after email verification
3. **Monitoring**: Active zones monitored for SOA changes
4. **Soft Delete**: Zones soft deleted (not permanently removed)
5. **Reactivation**: Soft-deleted zones can be re-enabled

### Zone Reactivation
- **Detection**: API checks for existing soft-deleted zones
- **Re-enabling**: Sets `is_active: true` and clears `deactivated_at`
- **History Preservation**: Maintains existing zone check history
- **User Feedback**: Different success messages for reactivation

### Remove Zone API (`/api/remove-zone`)
- **Soft Delete**: Sets `is_active: false`
- **Timestamp**: Records `deactivated_at` timestamp
- **User Validation**: Ensures zone belongs to user
- **Response**: Success message with zone name

## User Dashboard
### Dashboard Features
- **User Info**: Email, subscription tier, zone limits
- **Current Zone**: Currently selected zone for viewing
- **Zone History**: SOA change history with timestamps
- **All Zones**: List of all monitored zones
- **Zone Removal**: Remove zones from monitoring

### Dashboard State Management
- **Zone Removal**: Updates UI after successful removal
- **Success Feedback**: Shows success messages for operations
- **Navigation**: Back to home page functionality
- **Empty State**: Handles case when no zones remain

## Security Features
### Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Service Role**: API routes use service role for elevated privileges
- **Policy Enforcement**: Proper RLS policies on all tables

### Input Validation
- **Client-side**: Zod schema validation in forms
- **Server-side**: API route validation
- **Email Validation**: Proper email format checking
- **Zone Validation**: DNS zone format validation

## User Experience
### Registration Flow
- **Multi-step Process**: Form → Email verification → Success
- **Loading States**: Visual feedback during operations
- **Error Handling**: Clear error messages
- **Success Feedback**: Confirmation of successful operations

### Login Flow
- **Simple Authentication**: Email + DNS zone
- **Dashboard Access**: Immediate access to monitoring data
- **Zone Selection**: View specific zone data
- **Navigation**: Easy navigation between views

### Zone Management
- **Visual Feedback**: Success messages for zone operations
- **Loading States**: Button loading states during operations
- **Error Handling**: Proper error messages
- **State Updates**: Real-time UI updates

## Future Enhancements
### Authentication Improvements
- **Password Authentication**: Traditional username/password
- **Social Login**: Google, GitHub, etc.
- **Two-Factor Authentication**: Enhanced security
- **Session Management**: Proper session handling

### User Management
- **Profile Management**: User profile editing
- **Password Reset**: Forgot password functionality
- **Account Deletion**: Complete account removal
- **Billing Integration**: Subscription management

### Advanced Features
- **Team Management**: Multiple users per organization
- **Role-based Access**: Different permission levels
- **API Keys**: Programmatic access
- **Webhooks**: Real-time notifications
