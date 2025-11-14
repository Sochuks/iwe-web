# Google OAuth Setup Guide

## ✅ Implementation Complete!

All necessary files have been created and configured for Google OAuth integration.

---

## 📁 Files Created/Modified

### ✅ Created Files:
1. `.env.local.example` - Environment variables template
2. `types/auth.ts` - TypeScript interfaces for authentication
3. `contexts/AuthContext.tsx` - Authentication context provider
4. `pages/auth/google/callback.tsx` - OAuth callback handler
5. `GOOGLE_OAUTH_SETUP.md` - This guide

### ✅ Modified Files:
1. `utils/auth.ts` - Added session management functions
2. `pages/_app.tsx` - Wrapped app with AuthProvider
3. `pages/login.tsx` - Updated to use correct environment variables

---

## 🔧 Next Steps

### 1. Create `.env.local` File

Create a new file `.env.local` in the root directory with your actual credentials:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Then edit `.env.local` with your values:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id
NEXT_PUBLIC_GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback
GOOGLE_CLIENT_SECRET=your_actual_client_secret
NEXT_PUBLIC_BACKEND_API_URL=http://your-backend-url.com
```

**Important:** The `.env.local` file is gitignored and will not be committed.

---

### 2. Google Cloud Console Setup

Go to [Google Cloud Console](https://console.cloud.google.com/) and:

#### A. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Configure:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://yourdomain.com (for production)
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/google/callback
https://yourdomain.com/auth/google/callback (for production)
```

#### B. Enable Required APIs

Enable these APIs in your Google Cloud project:
- Google+ API
- People API (for phone number access)

#### C. Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/user.phonenumbers.read` (optional)

---

### 3. Backend API Endpoint

Ensure your backend has this endpoint:

**POST** `/google/user/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullname": "John Doe",
  "telephone": "+1234567890"
}
```

**Response:**
```json
{
  "data": {
    "access_token": "jwt_token_here",
    "role_name": "User",
    "data": {
      "id": "user_id",
      "email": "user@example.com",
      "fullname": "John Doe",
      "username": "johndoe",
      "telephone": "+1234567890"
    }
  }
}
```

---

### 4. Enable CORS on Backend

Make sure your backend allows requests from:
- `http://localhost:3000` (development)
- `https://yourdomain.com` (production)

---

## 🧪 Testing the Flow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Login Flow

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. You should be redirected to Google's login page
4. After authentication, you'll be redirected to `/auth/google/callback`
5. The callback page will:
   - Exchange code for tokens
   - Decode user info
   - Fetch phone number (if available)
   - Send data to your backend
   - Store JWT token
   - Redirect to `/dashboard`

### 3. Check Browser Console

Open DevTools Console to see:
- Authentication progress logs
- Any errors during the flow
- Network requests to Google and your backend

---

## 🔍 Troubleshooting

### Error: "No authorization code"
- Check that redirect URI in Google Console matches exactly
- Verify `.env.local` has correct `NEXT_PUBLIC_GOOGLE_REDIRECT_URL`

### Error: "Authentication failed"
- Check backend API URL is correct
- Verify backend endpoint `/google/user/login` exists
- Check CORS is enabled on backend
- Look at Network tab for failed requests

### Error: "redirect_uri_mismatch"
- Redirect URI in Google Console must match exactly
- Include protocol (`http://` or `https://`)
- No trailing slashes

### Phone number not fetched
- This is optional and won't break the flow
- Ensure People API is enabled in Google Console
- User may not have phone number in Google account

---

## 📊 Authentication Flow Diagram

```
┌─────────────┐
│   User      │
│ clicks      │
│ "Login"     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Redirect to Google OAuth       │
│  (with client_id, redirect_uri) │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  User authenticates with Google │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Google redirects to callback   │
│  with authorization code        │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Exchange code for tokens       │
│  (id_token, access_token)       │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Decode id_token for user info  │
│  (email, name)                  │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Fetch phone from People API    │
│  (optional)                     │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Send to backend:               │
│  POST /google/user/login        │
│  { email, fullname, telephone } │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Backend returns JWT token      │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Store token in cookies/        │
│  localStorage                   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Redirect to /dashboard         │
└─────────────────────────────────┘
```

---

## 🔐 Security Notes

1. **Never commit `.env.local`** - It's gitignored by default
2. **Use HTTPS in production** - Set `secure: true` for cookies
3. **Validate tokens on backend** - Don't trust client-side tokens
4. **Set appropriate cookie expiry** - Currently 7 days
5. **Use CSRF protection** - Consider adding state parameter validation

---

## 🚀 Production Deployment

Before deploying to production:

1. Update `.env.local` with production URLs
2. Add production redirect URI to Google Console
3. Enable HTTPS
4. Update CORS settings on backend
5. Test the complete flow in production environment

---

## 📝 Using Authentication in Components

### Check if user is logged in:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isLoggedIn, user } = useAuth();
  
  if (!isLoggedIn) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {user?.fullname}!</div>;
}
```

### Logout:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function LogoutButton() {
  const { logout } = useAuth();
  
  return <button onClick={logout}>Logout</button>;
}
```

---

## ✅ Checklist

- [ ] Created `.env.local` with actual credentials
- [ ] Set up Google OAuth credentials in Cloud Console
- [ ] Added authorized redirect URIs
- [ ] Enabled People API (for phone numbers)
- [ ] Backend endpoint `/google/user/login` is ready
- [ ] CORS enabled on backend
- [ ] Tested login flow locally
- [ ] Verified token storage
- [ ] Tested logout functionality
- [ ] Ready for production deployment

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify all environment variables are set
4. Ensure backend is running and accessible
5. Check Google Cloud Console for API quotas

---

**Happy coding! 🎉**
