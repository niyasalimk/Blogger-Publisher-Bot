const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function checkApiKey() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Checking API Key format...");
    if (!key) {
        console.log("❌ Error: GEMINI_API_KEY is missing from .env");
        return;
    }
    console.log(`Key starts with: ${key.substring(0, 7)}...`);
    console.log(`Key length: ${key.length}`);

    // Attempt a direct fetch to the listModels endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("✅ API Key is VALID. Available models:");
            if (data.models) {
                data.models.slice(0, 5).forEach(m => console.log(` - ${m.name}`));
            } else {
                console.log("No models found in response.");
            }
        } else {
            console.log("❌ API Key check FAILED.");
            console.log("Status:", response.status);
            console.log("Message:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.log("❌ Network error:", error.message);
    }
}

checkApiKey();
