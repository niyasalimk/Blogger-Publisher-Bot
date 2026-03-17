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

    if (pairingCode) {
        return res.send(`
            <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h1>🔗 Pairing Code</h1>
                <p>Enter this code on your WhatsApp (Link Device > Link with Phone Number):</p>
                <div style="background:#e8f5e9; padding:20px; font-size:40px; font-weight:bold; letter-spacing:10px; border:2px dashed #4caf50; display:inline-block; margin:20px;">
                    ${pairingCode}
                </div>
                <p style="color:#666;">This code refreshes automatically.</p>
                <script>setTimeout(() => location.reload(), 10000);</script>
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
        timeout: 60000, // Wait 60s for browser to start
    },
    authTimeoutMs: 60000, // Wait 60s for auth handshake
    qrMaxRetries: 10,     // Retry generating QR up to 10 times
});

console.log('🏁 Initializing WhatsApp client...');


let pairingCode = null;

client.on('qr', async (qr) => {
    // Check if user prefers Pairing Code (Link with Number)
    const pairingNumber = process.env.PAIRING_NUMBER;

    if (pairingNumber && !pairingCode) {
        console.log(`🔗 Requesting Pairing Code for: ${pairingNumber}...`);
        try {
            // requestPairingCode returns a Promise<string>
            const code = await client.requestPairingCode(pairingNumber);
            pairingCode = code; // Store it to show on web

            console.log('\n' + '='.repeat(40));
            console.log('📱 WHATSAPP PAIRING CODE');
            console.log(`🔢 CODE: ${code}`);
            console.log('='.repeat(40) + '\n');

            lastQr = null; // Hide QR since we are using code
        } catch (err) {
            console.error('❌ Failed to request pairing code:', err);
        }
        return;
    }

    if (!pairingNumber) {
        lastQr = qr;
        lastQrTime = new Date().toLocaleTimeString();

        console.log('\n' + '='.repeat(40));
        console.log('📱 WHATSAPP QR CODE RECEIVED');
        console.log(`🔗 VIEW SCANNABLE QR HERE: http://localhost:${port}/qr`);
        console.log('='.repeat(40) + '\n');

        qrcode.generate(qr, { small: false });
    }
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

// Memory for chat contexts (refinement support)
const chatContexts = {};

client.on('message_create', async (msg) => {
    if (!msg.body.startsWith('!')) return;

    const chat = await msg.getChat();
    const chatId = chat.id._serialized;
    const text = msg.body.toLowerCase();
    console.log(`📩 Received command from ${chatId}: ${text}`);

    if (text.startsWith('!publish ')) {
        const rawContent = msg.body.slice(9).trim();

        try {
            msg.reply('🚀 Processing... (Context Active)');

            // 1. Parse details
            let jobDetails = await parseJobFromMessage(rawContent);

            // Refinement Logic
            if (chatContexts[chatId]) {
                const prev = chatContexts[chatId];
                // Merge new details into old
                jobDetails = {
                    ...prev,
                    ...Object.fromEntries(Object.entries(jobDetails).filter(([_, v]) => v !== null && v !== "" && v !== undefined)),
                    customDirectives: [prev.customDirectives, jobDetails.customDirectives].filter(Boolean).join(". ")
                };
            }

            // Store for next time
            chatContexts[chatId] = jobDetails;

            if (!jobDetails || !jobDetails.title) {
                return msg.reply('❌ Could not understand. Please include at least a Job Title.');
            }

            // 2. Generate Content (Bot generator currently doesn't support context-aware HTML refinement yet, but it gets the merged details)
            const htmlContent = await generateJobContent(jobDetails);

            // 3. Submit to Dashboard
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            const userId = process.env.USER_ID;

            if (!userId) throw new Error("USER_ID is not configured.");

            const response = await fetch(`${backendUrl}/api/bot/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    title: `${jobDetails.title} - ${jobDetails.location || 'Remote'}`,
                    htmlContent: htmlContent,
                    mode: 'job'
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            msg.reply(`🎉 Success! Sent to Dashboard.\n\n📌 Title: ${jobDetails.title} \n🆔 ID: ${result.postId}\n\nReview it here: ${backendUrl}/planner`);

        } catch (error) {
            console.error('❌ Bot Error:', error);
            msg.reply(`❌ Failed: ${error.message}`);
        }
    }

    if (text === '!new' || text === '!reset') {
        delete chatContexts[chatId];
        return msg.reply('🆕 *Session Reset.* Your previous context has been cleared. You can now start a fresh post!');
    }


    // !list command - Show recent posts
    if (text === '!list') {
        const { listPosts } = require('./lib/blogger');
        const posts = await listPosts(5);
        if (posts.length === 0) return msg.reply('📭 No posts found.');

        let response = '*Recent Posts:*\n';
        posts.forEach(p => {
            response += `\n📌 *${p.title}*\n🆔 \`${p.id}\`\n🔗 ${p.url}\n`;
        });
        return msg.reply(response);
    }

    // !edit command - Update an existing post
    if (text.startsWith('!edit ')) {
        const content = msg.body.slice(6).trim();
        // Extract ID (first word) and the rest is details
        const firstSpace = content.indexOf(' ');
        if (firstSpace === -1) return msg.reply('❌ Usage: !edit <POST_ID> <New Job Details...>');

        const postId = content.substring(0, firstSpace);
        const jobDescription = content.substring(firstSpace + 1);

        console.log(`📝 Editing Post ${postId} with: ${jobDescription.substring(0, 30)}...`);
        msg.reply('🔄 analyzing updates...');

        try {
            const { updatePost, getPost } = require('./lib/blogger');

            // Verify post exists
            const existingPost = await getPost(postId);
            if (!existingPost) return msg.reply('❌ Post not found. Check the ID with !list');

            // Parse new details
            const jobDetails = await parseJobFromMessage(jobDescription);
            if (!jobDetails || !jobDetails.title) return msg.reply('❌ Could not understand the new details.');

            // Generate Content & Update
            const htmlContent = await generateJobContent(jobDetails);
            const updated = await updatePost(postId, `${jobDetails.title} - ${jobDetails.location || 'Remote'}`, htmlContent);

            msg.reply(`✅ *Post Updated Successfully!*\n\n📌 Title: ${updated.title}\n🔗 URL: ${updated.url}`);
        } catch (e) {
            console.error(e);
            msg.reply(`❌ Update Failed: ${e.message}`);
        }
    }

    if (text === '!help') {
        msg.reply('🤖 Welcome to *Publixa AI*! 🚀\n\n📝 *New Post:* `!publish <Details>`\n🆕 *Clear Session:* `!new` (Start a fresh post)\n🚀 *Quick Action:* `!publish now` (Skip review)\n📋 *List Posts:* `!list`');
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
