const { google } = require("googleapis");
const express = require("express");
require("dotenv").config();

const app = express();
const port = 3000;

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${port}/oauth2callback`
);

app.get("/", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/blogger"],
        prompt: "consent",
    });
    res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log("\n✅ Tokens received!");
        console.log("------------------");
        console.log("REFRESH_TOKEN:", tokens.refresh_token);
        console.log("------------------");
        console.log("Add this REFRESH_TOKEN to your .env file.");
        res.send("Authentication successful! Check your terminal for the refresh token.");
        process.exit(0);
    } catch (error) {
        res.send("Error during authentication: " + error.message);
    }
});

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in .env");
    process.exit(1);
}

app.listen(port, () => {
    console.log(`🔗 Open http://localhost:${port} in your browser to authorize the bot.`);
});
