const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
}

if (!envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY')) {
    const keys = webpush.generateVAPIDKeys();

    fs.appendFileSync(envPath, `\n\n# Web Push Notifications\n`);
    fs.appendFileSync(envPath, `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
    fs.appendFileSync(envPath, `VAPID_PRIVATE_KEY=${keys.privateKey}\n`);

    console.log('✅ VAPID keys generated and saved to .env.local');
} else {
    console.log('ℹ️ VAPID keys already exist in .env.local');
}
