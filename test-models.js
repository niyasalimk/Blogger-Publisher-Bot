const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listAllModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // The SDK doesn't have a direct listModels, but we can try to fetch the models list via raw fetch if needed, 
    // or use the older method if available.
    // Actually, we can try to use a very basic model name like 'gemini-pro'.

    console.log("Checking API Key: ", process.env.GEMINI_API_KEY ? "Present (Starts with AIza)" : "Missing");

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-1.5-flash");
    } catch (err) {
        console.log("gemini-1.5-flash failed:", err.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("test");
        console.log("Success with gemini-1.0-pro");
    } catch (err) {
        console.log("gemini-1.0-pro failed:", err.message);
    }
}

listAllModels();
