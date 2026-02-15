const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateJobContent(jobDetails) {
    // Ordered preference for models available to your key
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "google/gemini-pro"];

    const prompt = `
    You are a professional SEO content writer. Create a high-quality, SEO-friendly job blog post based on these details:
    Job Title: ${jobDetails.title}
    Company: ${jobDetails.company || "Confidential"}
    Location: ${jobDetails.location}
    Salary: ${jobDetails.salary || "Not Specified"}
    Job Type: ${jobDetails.type || "Full-time"}
    Brief Requirements: ${jobDetails.requirements}

    The article MUST:
    1. Be between 700 to 1000 words.
    2. Be in valid HTML format (using <h1>, <h2>, <p>, <ul>, <li> tags).
    3. Include a catchy H1 title that includes the job title and location.
    4. Use H2 headers for sections like 'Job Overview', 'Key Responsibilities', 'Candidate Requirements', 'Compensation & Benefits', and 'How to Apply'.
    5. Maintain a professional yet engaging tone.
    6. Include a section for 'Frequently Asked Questions' (FAQ) at the end.
    7. Naturally incorporate SEO keywords related to the job.
    8. Be formatted ready to be pasted into Blogger.

    Output ONLY the HTML content.
  `;

    for (const modelName of models) {
        try {
            console.log(`🤖 Attempting with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/```html/g, "").replace(/```/g, "").trim();
            return text;
        } catch (error) {
            if (error.message.includes("429") || error.message.includes("quota")) {
                console.log(`⚠️  ${modelName} hit quota limit. Trying next model...`);
                continue;
            }
            if (error.message.includes("404")) {
                console.log(`⚠️  ${modelName} not found. Trying next model...`);
                continue;
            }
            console.error(`❌ Error with ${modelName}:`, error.message);
            throw error;
        }
    }

    throw new Error("All available AI models are currently overwhelmed or hitting quota. Please wait 1 minute and try again.");
}

module.exports = { generateJobContent };
