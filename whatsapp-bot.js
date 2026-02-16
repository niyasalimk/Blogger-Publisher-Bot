/*
 * WhatsApp Bot for Blogger
 * Optimized for Railway Deployment with Error Handling
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { generateJobContent, parseJobFromMessage } = require('./lib/openrouter');
const { createDraft } = require('./lib/blogger');
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 🛡️ CRASH PREVENTION & DIAGNOSTICS
// ==========================================
let startupError = null;

// Catch unhandled errors so the server stays up to report them
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    startupError = `Uncaught Exception:\n${err.message}\n\nStack:\n${err.stack}`;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    startupError = `Unhandled Rejection:\n${reason}`;
});

let lastQr = null;
let lastQrTime = null;

// ==========================================
// 🌍 WEB SERVER (Health Check & QR)
// ==========================================
app.get('/', (req, res) => {
    if (startupError) {
        return res.status(500).send(`
            <h1>🚨 Bot Failed to Start</h1>
            <p><strong>Error Details:</strong></p>
            <pre style="background:#eee; padding:15px; border-radius:5px;">${startupError}</pre>
        `);
    }
    res.send('Bot is running! 🚀 <br><br> <a href="/qr">View QR Code</a>');
});

app.get('/qr', (req, res) => {
    console.log(`🔎 QR page accessed at ${new Date().toLocaleTimeString()}`);

    if (startupError) {
        return res.status(500).send(`
            <div style="font-family:sans-serif; text-align:center; color: #721c24; margin-top:50px;">
                <h1>⚠️ Bot Failed to Start</h1>
                <p>Please check the error below and the Railway Logs.</p>
                <div style="text-align:left; background:#f8d7da; padding:20px; max-width:800px; margin:20px auto; overflow:auto; border-radius:10px; border:1px solid #f5c6cb;">
                    <pre>${startupError}</pre>
                </div>
                <button onclick="location.reload()" style="padding:10px 20px;">Retry</button>
            </div>
        `);
    }

    if (!lastQr) {
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h2>Bot is Starting... ⏳</h2>
                <p>Waiting for QR code from WhatsApp.</p>
                <p>This page will auto-refresh every 5 seconds.</p>
                <script>setTimeout(() => location.reload(), 5000);</script>
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
                    <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#25d366; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">Refresh Code</button>
                </div>
                <script>setTimeout(() => location.reload(), 20000);</script>
            </body>
        </html>
    `);
});

app.listen(port, '0.0.0.0', () => console.log(`📡 Health check server listening on port ${port}`));

// ==========================================
// 📱 WHATSAPP CLIENT CONFIGURATION
// ==========================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'linux' ? '/usr/bin/chromium' : undefined),
        headless: process.platform === 'linux' ? true : false,
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

    console.log('\n' + '='.repeat(40));
    console.log('📱 WHATSAPP QR CODE RECEIVED');
    console.log(`🔗 VIEW SCANNABLE QR HERE: http://localhost:${port}/qr`);
    console.log('='.repeat(40) + '\n');

    qrcode.generate(qr, { small: false });
});

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ LOADING SCREEN: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
    lastQr = null;
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure:', msg);
    startupError = `Authentication Failure: ${msg}`;
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

// INITIALIZE WITH ERROR CATCHING
client.initialize().catch(err => {
    console.error('❌ FATAL ERROR DURING INITIALIZATION:', err);
    startupError = `Initialization Error: ${err.message}`;
});
