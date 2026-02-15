require("dotenv").config();

async function generateJobContent(jobDetails) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "your_openrouter_api_key") {
        throw new Error("OPENROUTER_API_KEY is missing or not configured in .env");
    }

    const prompt = `
    You are a professional SEO content writer and Web Designer. Create a high-quality, SEO-optimized job blog post with a STUNNING, PREMIUM design.
    
    Job Details:
    Job Title: ${jobDetails.title}
    Company: ${jobDetails.company || "Confidential"}
    Location: ${jobDetails.location}
    Salary: ${jobDetails.salary || "Not Specified / Competitive"}
    Job Type: ${jobDetails.type || "Full-time"}
    Brief Requirements: ${jobDetails.requirements}
    Apply Link: ${jobDetails.applyLink || ""}
    Apply Email: ${jobDetails.applyEmail || ""}
    Interview Details: ${jobDetails.interviewDate ? `Company: ${jobDetails.company || "Confidential"}, Date: ${jobDetails.interviewDate}, Time: ${jobDetails.interviewTime}, Location: ${jobDetails.interviewLocation}` : "None"}

    STRICT CONTENT STRUCTURE (SEO WINNING FORMULA):
    1. Introduction (100–150 words): Engaging intro about the job and industry.
    2. About Company (150–200 words): Detailed profile of the company.
    3. Walk-in Interview Details (ONLY if Interview Details are provided): Create a high-visibility box with Company Name, Date, Time, and Venue.
    4. Available Positions: List the main position and any related roles.
    5. Job Requirements: Bulleted list of skills and qualifications.
    6. Benefits: What the company offers (Salary, Insurance, etc.).
    7. How to Apply: Clear instructions with the Apply Link/Email.
    8. Important Notes: Key dates or specific instructions.
    9. FAQ Section: 3–5 relevant questions and answers.
    10. Conclusion: Final encouraging closing statement.

    DESIGN & FORMATTING RULES:
    1. Output ONLY the HTML code. NO markdown blocks.
    2. USE INLINE CSS for all styling (Blogger friendly).
    3. NO <html>, <head>, or <body> tags.
    4. MOBILE-FRIENDLY: Use width: 100%, max-width: 850px, font-size: 16px.
    5. AESTHETICS:
       - Header Card: Gradient background (#1a2c5b to #0984e3), rounded corners (15px), white text.
       - Interview Box: A bright accent box (e.g., light yellow/orange background #fff3e0 with a #e67e22 border) to make walk-in details stand out.
       - Sections: Use <h2> with a bottom border or accent color.
       - Badges: Stylized tags for 'Location', 'Salary', 'Type'.
       - Buttons: Large, clickable styled buttons for Applying.
    `;

    try {
        console.log("🚀 Requesting content from OpenRouter...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000", // Optional, for OpenRouter rankings
                "X-Title": "Blogger Publisher Bot",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001", // Or any other model like "anthropic/claude-3.5-sonnet"
                messages: [
                    { role: "user", content: prompt }
                ],
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`OpenRouter Error: ${data.error?.message || response.statusText}`);
        }

        let text = data.choices[0].message.content;

        // Clean up markdown code blocks if present
        text = text.replace(/```html/g, "").replace(/```/g, "").trim();

        return text;
    } catch (error) {
        console.error("Error generating content via OpenRouter:", error.message);
        throw error;
    }
}

async function parseJobFromMessage(message) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");

    const prompt = `
    Extract job details from this message into a JSON object.
    Fields: title, location, requirements, company, salary, applyLink, applyEmail, type, interviewDate, interviewTime, interviewLocation.
    If a field is missing, use null.
    
    Message: "${message}"
    
    Output ONLY the JSON object.
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const text = data.choices[0].message.content;
        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing message:", error.message);
        return null;
    }
}

module.exports = { generateJobContent, parseJobFromMessage };
