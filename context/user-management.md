# User Management and Authentication Context

## User Registration Flow
### Multi-Step Registration Process
1. **Form Submission**: User enters email and DNS zone
2. **Password Setup**: New users must set a secure password
3. **Email Verification**: Users receive confirmation email after password setup
4. **Zone Activation**: Zones activated only after email verification
5. **Auto-Login**: Users automatically logged in after verification

### Registration API (`/api/register`)
- **Input Validation**: Zod schema validation
- **User Creation**: Creates user with `email_confirmed: false`, `password_set: false`
- **Zone Management**: Handles both new zones and reactivation
- **Subscription Limits**: Enforces 1 zone limit for free users
- **Existing User Check**: Redirects to login if user already has password

## Password-Based Authentication System
### Password Setup Flow
1. **Registration**: User registers with email and DNS zone
2. **Password Creation**: User sets secure password via `PasswordSetup` component
3. **Supabase Auth**: Creates user in Supabase Auth with password
4. **Email Verification**: Triggers email verification process
5. **Auto-Login**: User automatically logged in after verification

### Password Setup API (`/api/setup-password`)
- **Input**: `{ email: string, password: string }`
- **Supabase Auth**: Creates user in Supabase Auth with password
- **User Update**: Sets `password_set: true` in users table
- **Response**: Returns `emailVerificationRequired: true` flag

### Login API (`/api/login`)
- **Input**: `{ email: string, password: string }`
- **Supabase Auth**: Authenticates user with email/password
- **User Lookup**: Finds user in users table with `email_confirmed: true`
- **Response**: User data, zones, and SOA history

### Forgot Password API (`/api/forgot-password`)
- **Input**: `{ email: string }`
- **Resend API**: Uses Resend API exclusively for password reset emails
- **User Validation**: Checks if user exists and has password set
- **Security**: Always returns success to prevent email enumeration
- **Custom Template**: Professional HTML email template with reset link
- **Response**: Success message (regardless of user existence)

### Reset Password API (`/api/reset-password`)
- **Input**: `{ token: string, email: string, newPassword: string }`
- **User Validation**: Verifies user exists and has password set
- **Supabase Auth**: Updates password in Supabase Auth system
- **Security**: Validates reset token and user ownership
- **Response**: Success confirmation

## Email Verification System
### Resend-Only Verification Process
- **Resend API**: Uses Resend API exclusively for all email sending
- **Custom Tokens**: Generates secure verification tokens (no Supabase Auth dependency)
- **Status Sync**: Manages verification status in users table
- **Zone Activation**: Zones become active after verification
- **Auto-Login**: Users automatically logged in after verification

### Verification API (`/api/verify-email`)
- **Custom Token**: Validates custom verification tokens (not Supabase Auth tokens)
- **User Update**: Sets `email_confirmed: true` in users table
- **Zone Activation**: Activates zones if password is set
- **Auto-Login**: Triggers auto-login if password is set

### Verification Status API (`/api/check-verification-status`)
- **Users Table Check**: Checks verification status in users table
- **Supabase Auth Sync**: Syncs with Supabase Auth if needed
- **Zone Activation**: Auto-activates zones when verification detected
- **Response**: Returns verification status and password setup requirement

### Send Verification Email API (`/api/send-verification-email`)
- **Resend Integration**: Uses Resend API exclusively for email sending
- **Custom Tokens**: Generates secure verification tokens
- **Professional Template**: HTML email template with verification link
- **No Supabase Auth**: Completely independent of Supabase Auth email system

## Auto-Login System
### Auto-Login After Verification
- **Trigger**: Email verification page redirects with `autoLogin=true` parameter
- **API Call**: Calls `/api/auto-login-after-verification`
- **User Lookup**: Finds verified user with password set
- **Zone Data**: Returns user data and active zones
- **Dashboard Access**: Automatically logs user into dashboard

### Auto-Login API (`/api/auto-login-after-verification`)
- **Input**: `{ email: string }`
- **User Validation**: Checks `email_confirmed: true` and `password_set: true`
- **Zone Fetching**: Gets all active zones for user
- **Response**: User data, current zone, all zones, empty history

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
