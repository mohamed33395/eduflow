# Multi-Stage Authentication Setup Guide

This document explains the multi-stage authentication system implemented in EduFlow, following the Constrix authentication flow.

## Overview

The new auth system supports:
- **Multi-stage login**: Identifier → Password/OTP → Completion
- **Password recovery**: OTP verification → Password reset
- **Alternative login methods**: Switch between password, email OTP, and SMS OTP
- **Rate limiting**: Protection against brute force attacks
- **User enumeration prevention**: Consistent responses for non-existent accounts

## Backend Implementation

### New Files Created

1. **DTOs**: `server/src/auth/dto/multi-stage-auth.dto.ts`
   - `GetLoginWaysDto`: Discover available login methods
   - `LoginStepDto`: Execute login step (password or OTP)
   - `AlternativeStepLoginDto`: Switch login method
   - `ResendOtpDto`: Resend OTP
   - `ValidateResetPasswordOtpDto`: Verify OTP for password reset
   - `ResetPasswordWithTokenDto`: Reset password with verified token

2. **Service**: `server/src/auth/multi-stage-auth.service.ts`
   - Implements all multi-stage auth logic
   - Uses raw SQL queries for new tables (until Prisma schema is updated)
   - Integrates with existing MailService for OTP emails

3. **Controller**: `server/src/auth/multi-stage-auth.controller.ts`
   - Exposes endpoints at `/auths/*`
   - Includes rate limiting via `@Throttle` decorator

4. **SQL Migration**: `server/prisma/multi-stage-auth.sql`
   - Creates `login_step_tokens` table
   - Creates `login_otps` table
   - Includes indexes for performance

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auths/get-login-ways` | POST | Discover available login methods |
| `/auths/login-step` | POST | Execute login step (password or OTP) |
| `/auths/alternative-step-login` | POST | Switch to alternative login method |
| `/auths/resend-otp` | POST | Resend OTP for current step |
| `/auths/validate-reset-password-otp` | POST | Verify OTP for password reset |
| `/auths/reset-password-with-token` | POST | Reset password with verified token |

### Database Setup

**IMPORTANT**: Run the SQL migration before using the new auth system:

```bash
# From the server directory
cd server
node run-migration.js
```

Or manually execute `server/prisma/multi-stage-auth.sql` against your Neon database.

The migration creates two tables:
- `login_step_tokens`: Tracks authentication stages (15 min TTL)
- `login_otps`: Stores OTP codes (10 min TTL, max 5 attempts)

## Frontend Implementation

### New Components

1. **Identifier Phase**: `app/login/login-phases/identifier.tsx`
   - Collects email/phone/username
   - Calls `/auths/get-login-ways`

2. **Password Phase**: `app/login/login-phases/password.tsx`
   - Collects password
   - Calls `/auths/login-step`
   - Links to forgot password

3. **OTP Phase**: `app/login/login-phases/otp.tsx`
   - Collects 5-digit OTP (Constrix compatibility)
   - Includes resend countdown (59s)
   - Calls `/auths/login-step` with OTP in password field

4. **Forget Password Phase**: `app/login/login-phases/forget-password.tsx`
   - Collects OTP for password reset
   - Calls `/auths/validate-reset-password-otp`

5. **Reset Password Phase**: `app/login/login-phases/reset-password.tsx`
   - Collects new password and confirmation
   - Validates password strength
   - Calls `/auths/reset-password-with-token`

6. **Main Form**: `app/login/MultiStageLoginForm.tsx`
   - Orchestrates all phases
   - Manages state (phase, tokens, identifiers)
   - Handles errors and loading states

### Updated Files

- `app/login/page.tsx`: Now uses `MultiStageLoginForm` instead of old `LoginForm`
- `app/lib/i18n/messages/ar.json`: Added Arabic translations
- `app/lib/i18n/messages/en.json`: Added English translations

### Environment Variables

Ensure the following is set in your frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Or your production backend URL.

## Authentication Flow

### Login Flow

1. **Identifier Phase**
   - User enters email/phone/username
   - Frontend calls `POST /auths/get-login-ways`
   - Backend returns step token and available login methods
   - Frontend transitions to password or OTP phase

2. **Password/OTP Phase**
   - User enters password or 5-digit OTP
   - Frontend calls `POST /auths/login-step` with step token
   - Backend validates credential
   - If valid, returns user data and JWT tokens
   - Frontend stores tokens and redirects to dashboard

3. **Alternative Methods**
   - User can switch from password to OTP (or vice versa)
   - Frontend calls `POST /auths/alternative-step-login`
   - Backend generates and sends new OTP
   - Frontend transitions to OTP phase

### Password Recovery Flow

1. **Initiate Reset**
   - User clicks "Forgot Password" from password phase
   - Frontend calls `POST /auths/forget-password` (existing endpoint)
   - Backend sends OTP to user's email
   - Frontend transitions to OTP verification phase

2. **Verify OTP**
   - User enters 5-digit OTP
   - Frontend calls `POST /auths/validate-reset-password-otp`
   - Backend validates OTP and returns reset token
   - Frontend transitions to password reset phase

3. **Reset Password**
   - User enters new password and confirmation
   - Frontend calls `POST /auths/reset-password-with-token`
   - Backend validates password strength and updates password
   - Frontend returns to identifier phase

## Security Features

1. **Step Tokens**: 15-minute expiration, single-use
2. **OTP Tokens**: 10-minute expiration, max 5 attempts
3. **Rate Limiting**: Throttled endpoints (3-10 requests per minute)
4. **Password Hashing**: bcrypt with cost factor 12
5. **User Enumeration Prevention**: Consistent responses for non-existent accounts
6. **Atomic OTP Consumption**: Prevents race conditions
7. **Session Revocation**: All sessions invalidated on password reset

## Compatibility with Constrix

The implementation follows the Constrix authentication contract:

- ✅ 5-digit OTP (not 6-digit)
- ✅ OTP sent in `password` field for login-step
- ✅ `validate-reset-password-otp` does NOT require token in body
- ✅ Password reset uses separate verified token
- ✅ Response structure matches Constrix envelope (`code/message/payload`)
- ✅ Login completion detected by empty `payload.login_way.step`

## Testing

### Manual Testing Steps

1. **Start Backend**
   ```bash
   cd server
   npm run start:dev
   ```

2. **Start Frontend**
   ```bash
   npm run dev -p 3002
   ```

3. **Test Login Flow**
   - Navigate to `http://localhost:3002/login`
   - Enter a registered email
   - Enter password (should login successfully)
   - Logout and try OTP flow (if user has no password)

4. **Test Password Recovery**
   - Click "Forgot Password"
   - Check email for OTP (or dev console if SMTP not configured)
   - Enter OTP
   - Set new password
   - Login with new password

### API Testing with cURL

```bash
# Get login ways
curl -X POST http://localhost:3001/auths/get-login-ways \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com"}'

# Login with password
curl -X POST http://localhost:3001/auths/login-step \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"password123","token":"step-token-here"}'

# Validate reset OTP
curl -X POST http://localhost:3001/auths/validate-reset-password-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","otp":"12345"}'

# Reset password
curl -X POST http://localhost:3001/auths/reset-password-with-token \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"NewPass123!","passwordConfirmation":"NewPass123!","token":"verified-token-here"}'
```

## Troubleshooting

### Migration Fails

If the SQL migration fails due to database connection:
1. Check `DATABASE_URL` in `.env.local`
2. Ensure Neon database is accessible
3. Run the SQL manually in Neon console

### OTP Not Received

If OTP emails are not sent:
1. Check SMTP configuration in backend `.env`
2. In development, OTP is logged to console
3. Check backend logs for `SMTP not configured` warning

### Frontend Shows Loading Forever

If requests hang:
1. Check `NEXT_PUBLIC_API_URL` is correct
2. Verify backend is running on port 3001
3. Check browser console for CORS errors

## Future Enhancements

- [ ] Add SMS OTP support (requires SMS provider)
- [ ] Add social login (OAuth)
- [ ] Implement Prisma models instead of raw SQL
- [ ] Add biometric authentication (WebAuthn)
- [ ] Implement device trust (remember me)
- [ ] Add 2FA/TOTP option

## Notes

- The old `LoginForm.tsx` is preserved for reference
- The old `/auth/login` endpoint still works for backward compatibility
- To fully switch to new system, remove old login components
- SQL migration should be run in production before deploying
