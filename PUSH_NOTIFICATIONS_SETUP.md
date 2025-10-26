# Push Notifications Setup Guide

## Overview
This guide will help you set up push notifications for the MEGG TECH application using Firebase Cloud Messaging (FCM).

## Prerequisites
1. Firebase project with Cloud Messaging enabled
2. Web app registered in Firebase
3. Service account credentials

## Step 1: Firebase Console Setup

### 1.1 Enable Cloud Messaging
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Cloud Messaging**
4. Enable **Cloud Messaging API**

### 1.2 Generate VAPID Key
1. In the Cloud Messaging tab, scroll to **Web configuration**
2. Click **Generate Key Pair**
3. Copy the generated VAPID key

### 1.3 Get Service Account Credentials
1. Go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Extract the following values:
   - `client_email`
   - `private_key`
   - `project_id`

## Step 2: Environment Variables

Create a `.env.local` file in the `web-next` directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase VAPID Key for Push Notifications
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# Firebase Admin SDK (for server-side operations)
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com
```

## Step 3: Update Service Worker Configuration

Update the Firebase configuration in `public/firebase-messaging-sw.js`:

```javascript
const firebaseConfig = {
  apiKey: "your_actual_api_key",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};
```

## Step 4: Test Push Notifications

### 4.1 Browser Testing
1. Start the development server: `npm run dev`
2. Navigate to the preferences page
3. Enable push notifications
4. Check browser console for any errors
5. Verify that a welcome notification appears

### 4.2 API Testing
Test the notification API endpoints:

```bash
# Test welcome notification
curl -X POST http://localhost:3000/api/notifications/send-welcome \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user_id"}'

# Test notification settings update
curl -X POST http://localhost:3000/api/notifications/update-notification-settings \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user_id", "pushNotificationsEnabled": true}'
```

## Step 5: Troubleshooting

### Common Issues

#### 1. "VAPID key is not configured"
- Ensure `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is set in your environment variables
- Restart the development server after adding environment variables

#### 2. "Firebase Cloud Messaging is not supported"
- This usually means the service worker isn't properly registered
- Check that `firebase-messaging-sw.js` is in the `public` directory
- Ensure HTTPS is used in production (required for service workers)

#### 3. "Notification permission denied"
- Users must manually grant permission in their browser
- Check browser settings for notification permissions
- Some browsers require HTTPS for notification permissions

#### 4. "FCM Token not available"
- Check Firebase console for proper app configuration
- Verify VAPID key is correct
- Check browser console for detailed error messages

### Debug Steps

1. **Check Browser Console**
   - Look for any JavaScript errors
   - Verify FCM token generation
   - Check service worker registration

2. **Check Network Tab**
   - Verify API calls are successful
   - Check for CORS issues
   - Ensure proper headers are sent

3. **Check Firebase Console**
   - Verify app is properly configured
   - Check Cloud Messaging settings
   - Review service account permissions

## Step 6: Production Deployment

### 6.1 Environment Variables
Ensure all environment variables are set in your production environment.

### 6.2 HTTPS Requirement
Push notifications require HTTPS in production. Ensure your domain has a valid SSL certificate.

### 6.3 Service Worker
The service worker must be accessible at the root of your domain (e.g., `https://yourdomain.com/firebase-messaging-sw.js`).

## Step 7: Monitoring

### 7.1 Firebase Console
- Monitor message delivery in Firebase Console
- Check for failed deliveries
- Review analytics data

### 7.2 Application Logs
- Monitor server-side logs for API errors
- Check client-side console for JavaScript errors
- Track notification permission changes

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Firebase documentation
3. Check browser compatibility
4. Verify all environment variables are correctly set 