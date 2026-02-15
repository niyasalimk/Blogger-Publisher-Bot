const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { generateJobContent, parseJobFromMessage } = require('./lib/openrouter');
const { createDraft } = require('./lib/blogger');
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple health check for Railway
app.get('/', (req, res) => res.send('Bot is running! 🚀 <br><br> <a href="/qr">View QR Code</a> if you need to log in.'));

let lastQr = null;
let lastQrTime = null;

// QR Code viewer for cloud logs
app.get('/qr', (req, res) => {
    console.log(`🔎 QR page accessed at ${new Date().toLocaleTimeString()}`);
    if (!lastQr) {
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h2>No QR code available yet.</h2>
                <p>The bot might be already connected, or still starting up.</p>
                <p>Check the Railway "Deploy Logs" to see the latest status.</p>
                <button onclick="location.reload()">Refresh Page</button>
            </div>
        `);
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQr)}`;

    res.send(`
        <html>
            <head>
                <title>WhatsApp Bot Login</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; background:#f0f2f5; margin:0; padding:20px; box-sizing:border-box;">
                <div style="background:white; padding:30px; border-radius:15px; box-shadow:0 4px 12px rgba(0,0,0,0.1); text-align:center; max-width:400px; width:100%;">
                    <h2 style="color:#25d366;">Scan with WhatsApp</h2>
                    <img src="${qrImageUrl}" alt="QR Code" style="border:10px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.1); margin:20px 0; max-width:100%;">
                    <p style="color:#666; font-size:14px;">Last updated: ${lastQrTime}</p>
                    <p style="margin-top:20px; font-size:13px; color:#888;">Open WhatsApp > Settings > Linked Devices > Link a Device</p>
                    <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#25d366; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">Refresh Code</button>
                </div>
                <script>setTimeout(() => location.reload(), 20000);</script>
            </body>
        </html>
    `);
});

app.listen(port, '0.0.0.0', () => console.log(`📡 Health check server listening on port ${port}`));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--hide-scrollbars',
            '--disable-notifications',
            '--disable-extensions'
        ],
    }
});

console.log('🏁 Initializing WhatsApp client...');

client.on('qr', (qr) => {
    lastQr = qr;
    lastQrTime = new Date().toLocaleTimeString();
    console.log(`📱 QR Code received at ${lastQrTime}. View it here: /qr`);
    qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ LOADING SCREEN: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
    lastQr = null; // Clear QR once authenticated
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure:', msg);
});

client.on('ready', () => {
    console.log('🚀 WhatsApp Bot is ready and listening!');
});

// Periodic memory log to detect crashes
setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`📊 RAM Usage: ${Math.round(mem.rss / 1024 / 1024)}MB`);
}, 30000);

client.on('message_create', async (msg) => {
    // Only process messages that start with !
    if (!msg.body.startsWith('!')) return;

    const text = msg.body.toLowerCase();
    console.log(`📩 Received command: ${text}`);

    if (text.startsWith('!publish ')) {
        const rawContent = msg.body.slice(9).trim();
        console.log(`📝 Processing publish command with content: ${rawContent.substring(0, 50)}...`);

        try {
            msg.reply('🚀 Processing your job post... Please wait.');

            // 1. Parse unstructured message into job details
            console.log('🔍 Parsing message via AI...');
            const jobDetails = await parseJobFromMessage(rawContent);

            console.log('✅ Parsed details:', JSON.stringify(jobDetails));

            if (!jobDetails || !jobDetails.title || !jobDetails.location) {
                console.log('⚠️ Failed to extract core details (title/location)');
                return msg.reply('❌ Could not understand the job details. Please ensure you include the Job Title and Location at a minimum.');
            }

            // 2. Generate SEO Content
            console.log('🤖 Generating SEO content...');
            const htmlContent = await generateJobContent(jobDetails);

            // 3. Create Draft on Blogger
            console.log('📝 Creating Blogger draft...');
            const post = await createDraft(`${jobDetails.title} - ${jobDetails.location}`, htmlContent, true);

            console.log('🎉 Successfully drafted post:', post.id);
            msg.reply(`🎉 Success! Your job post has been drafted.\n\n📌 Title: ${post.title}\n🔗 URL: ${post.url}\n🆔 ID: ${post.id}`);
        } catch (error) {
            console.error('❌ WhatsApp Bot Error:', error);
            msg.reply(`❌ Failed to process: ${error.message}`);
        }
    }

    if (text === '!help') {
        msg.reply('🤖 *Blogger Publisher Bot Help*\n\nSend a message starting with `!publish` followed by job details.\n\n*Example:* !publish We need a React Dev in Dubai. 3yrs exp. jobs@tech.com');
    }

    if (text === '!ping') {
        msg.reply('pong! 🏓 Bot is active.');
    }
});

client.initialize();
