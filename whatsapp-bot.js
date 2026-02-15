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

// QR Code viewer for cloud logs
app.get('/qr', (req, res) => {
    if (!lastQr) return res.send('No QR code available. The bot might be already connected or still starting.');

    res.send(`
        <html>
            <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                <h2>Scan this QR Code</h2>
                <div id="qrcode"></div>
                <p style="margin-top:20px;">The bot will refresh this page automatically if a new code is generated.</p>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                <script>
                    new QRCode(document.getElementById("qrcode"), "${lastQr}");
                    setTimeout(() => location.reload(), 30000); // Refresh every 30s
                </script>
            </body>
        </html>
    `);
});

app.listen(port, () => console.log(`📡 Health check server listening on port ${port}`));

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
            '--no-zygote',
            '--disable-gpu',
            '--hide-scrollbars',
            '--disable-notifications',
            '--disable-extensions'
        ],
    }
});

console.log('🏁 Initializing WhatsApp client...');

client.on('qr', (qr) => {
    console.log('📱 QR Code received! Current time:', new Date().toLocaleTimeString());
    lastQr = qr;
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
