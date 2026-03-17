const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// ADD THIS TO GOOGLE CLOUD CONSOLE: urn:ietf:wg:oauth:2.0:oob
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/blogger'
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the code from to that page here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ Authorization Successful!');
        console.log('-----------------------------------');
        console.log('YOUR NEW REFRESH TOKEN:');
        console.log(tokens.refresh_token);
        console.log('-----------------------------------');
    } catch (e) {
        console.error('Error retrieving access token:', e.message);
    }
    rl.close();
});
