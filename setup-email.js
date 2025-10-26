const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

// Check if .env.local already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!');
  console.log('Please check the file and ensure it contains:');
  console.log('EMAIL_USER=your-gmail@gmail.com');
  console.log('EMAIL_PASSWORD=your-app-password');
  console.log('NEXT_PUBLIC_APP_URL=http://localhost:3000');
} else {
  // Create .env.local template
  const envContent = `# Email Configuration for Password Reset
# Replace with your actual Gmail credentials

# Your Gmail address
EMAIL_USER=your-gmail@gmail.com

# Your Gmail App Password (16 characters)
# To get this: Google Account → Security → App passwords → Generate
EMAIL_PASSWORD=your-16-character-app-password

# Your application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Configuration (if needed)
# NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local template!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Edit .env.local and replace the placeholder values');
  console.log('2. Get your Gmail App Password:');
  console.log('   - Go to https://myaccount.google.com/');
  console.log('   - Security → 2-Step Verification → App passwords');
  console.log('   - Generate password for "Mail"');
  console.log('3. Restart your development server');
  console.log('4. Test at http://localhost:3000/test-email-config');
} 