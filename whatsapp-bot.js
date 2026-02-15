const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { generateJobContent, parseJobFromMessage } = require('./lib/openrouter');
const { createDraft } = require('./lib/blogger');
require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple health check for Railway
app.get('/', (req, res) => res.send('Bot is running! 🚀'));
app.listen(port, () => console.log(`📡 Health check server listening on port ${port}`));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('📱 Scan this QR code with WhatsApp to log in:');
    qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
    console.log('⏳ LOADING SCREEN:', percent, message);
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure:', msg);
});

client.on('ready', () => {
    console.log('🚀 WhatsApp Bot is ready and listening!');
});

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
