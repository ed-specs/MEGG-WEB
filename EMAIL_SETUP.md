# Email Service Setup for Password Reset

This guide will help you set up the email service for the password reset functionality.

## Prerequisites

1. A Gmail account
2. 2-factor authentication enabled on your Gmail account

## Step 1: Enable 2-Factor Authentication

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled

## Step 2: Generate App Password

1. In your Google Account settings, go to Security
2. Find "App passwords" (you'll only see this if 2FA is enabled)
3. Click "App passwords"
4. Select "Mail" as the app and "Other" as the device
5. Click "Generate"
6. Copy the generated 16-character password

## Step 3: Create Environment File

Create a `.env.local` file in the root of your `web-next` project with the following variables:

```env
# Email Configuration
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASSWORD=your-16-character-app-password

# Application URL (for reset password links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Test the Configuration

1. Start your development server: `npm run dev`
2. Go to the forgot password page
3. Enter a valid email address
4. Check if the reset email is sent successfully

## Troubleshooting

### Error: "Email service connection failed"

This usually means:
- The EMAIL_USER or EMAIL_PASSWORD environment variables are not set
- The app password is incorrect
- Gmail's security settings are blocking the connection

### Error: "Email service not configured"

This means the environment variables are missing. Make sure your `.env.local` file exists and contains the required variables.

### Gmail Security Issues

If Gmail blocks the connection:
1. Make sure you're using an App Password, not your regular password
2. Check if "Less secure app access" is enabled (though App Passwords are preferred)
3. Verify your Gmail account doesn't have any security restrictions

## Production Deployment

For production, make sure to:
1. Use environment variables in your hosting platform
2. Set `NEXT_PUBLIC_APP_URL` to your production domain
3. Consider using a dedicated email service like SendGrid or AWS SES for better reliability

## Security Notes

- Never commit your `.env.local` file to version control
- Use App Passwords instead of your regular Gmail password
- Regularly rotate your App Passwords
- Consider using a dedicated email service for production applications 