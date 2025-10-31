# User Management and Authentication Context

## User Registration Flow
### Multi-Step Registration Process (OTP-only)
1. **Form Submission**: User enters email and DNS zone
2. **Password Setup**: New users must set a secure password
3. **Email Verification (OTP)**: User receives a 6-digit OTP code via email
4. **Zone Activation**: Zones activate after successful OTP verification
5. **Auto-Login**: User is redirected to dashboard with auto-login

### Registration API (`/api/register`)
- **Input Validation**: Zod schema validation
- **User Creation**: Creates user with `email_confirmed: false`, `password_set: false`
- **Zone Management**: Handles both new zones and reactivation
- **Subscription Limits**: Enforces 2 zone limit for free users (Pro: unlimited)
- **Existing User Check**: Redirects to login only for un-authenticated callers; authenticated/verified users can add zones directly

## Password-Based Authentication System
### Password Setup Flow
1. **Registration**: User registers with email and DNS zone
2. **Password Creation**: User sets secure password via `PasswordSetup` component
3. **Supabase Auth**: Creates user in Supabase Auth with password
4. **Email Verification**: Triggers OTP email workflow
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

## Email Verification System (OTP)
### OTP Verification Process
- **Email Delivery**: Supabase Edge Function (`send-email`) sends OTP code
- **OTP Storage**: `users.verification_otp` and `users.otp_expires_at` hold code and expiry
- **Validation**: `/api/verify-otp` validates the code and marks email confirmed
- **Zone Activation**: Activates user zones upon successful verification
- **Auto-Login**: Redirects with `autoLogin=true` and optional `zone` parameter

### APIs
- **Send OTP** (`/api/send-verification-email`): Generates 6-digit OTP, stores it, invokes `send-email` Edge Function with text+html content
- **Verify OTP** (`/api/verify-otp`): Validates OTP, confirms email, activates zones, clears OTP fields

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
- **Free Tier**: 2 DNS zone limit
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
- **User Info**: Email, subscription tier, zone limits; sign out control
- **Current Zone**: Currently selected zone for viewing (switch between zones)
- **Zone History**: SOA change history with timestamps
- **All Zones**: List of all monitored zones
- **Zone Removal**: Remove zones from monitoring
- **Add Zone**: Add new zones from the dashboard (post-verification)

### Dashboard State Management
- **Zone Removal**: Updates UI after successful removal
- **Success Feedback**: Shows success messages for operations
- **Navigation**: Auto-route to dashboard when authenticated; sign out returns to landing
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
