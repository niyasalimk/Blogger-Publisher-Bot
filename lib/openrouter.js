require("dotenv").config();

async function generateJobContent(jobDetails) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "your_openrouter_api_key") {
        throw new Error("OPENROUTER_API_KEY is missing or not configured in .env");
    }

    const styles = [
        { name: "Professional & Corporate", tone: "formal, concise, and authoritative", persona: "Senior HR Consultant" },
        { name: "Friendly & Engaging", tone: "conversational, warm, and inviting", persona: "Talent Acquisition Partner" },
        { name: "Dynamic & Energetic", tone: "fast-paced, exciting, and growth-oriented", persona: "Tech Recruiter" },
        { name: "Storytelling", tone: "narrative, descriptive, and inspiring", persona: "Career Coach" }
    ];

    const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
    const seed = Date.now();

    // Priority Instructions from the user
    const customRules = jobDetails.customDirectives ? `
    **STRICT OVERRIDE INSTRUCTIONS (PRIORITY #1):**
    The user has specified these rules. FOLLOW THEM EXACTLY, even if they change the structure:
    ${jobDetails.customDirectives}
    ` : '';


    const prompt = `
    ACT AS A ${selectedStyle.persona.toUpperCase()}. 
    Tone: ${selectedStyle.tone}.
    Randomization Seed: ${seed} (Ensure structural uniqueness from previous versions).

    Create a unique, high-quality job blog post for the following role. 
    **STRICT RULE:** DO NOT use robotic AI phrases like "In today's fast-paced world", "Unlock your potential", or "Are you looking for a rewarding career". Write like a HUMAN.

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

    ${customRules}

    STRICT CONTENT STRUCTURE:
    1. Introduction (120–180 words): Write a UNIQUE intro. If the style is 'Storytelling', start with a scenario. If 'Corporate', start with industry impact.
    2. About Company (150–200 words): REWRITE this section from scratch. Describe the company's mission and culture in your own words.
    3. Walk-in Interview Details (ONLY if provided): High-visibility box.
    4. Available Positions: List roles.
    5. Job Requirements: Bulleted list, vary the phrasing (e.g., 'What you bring', 'Requirements', 'Who we are looking for').
    6. Benefits: Highlight why they should join.
    7. How to Apply: Clear instructions.
    8. FAQ Section: 3–5 UNIQUE questions based on the job type.
    9. Conclusion: Human-like closing.

    DESIGN & FORMATTING:
    1. Output ONLY HTML. No markdown.
    2. STRICT INLINE CSS.
    3. MOBILE-FRIENDLY (max-width: 850px).
    4. AESTHETICS: Modern gradients, rounded corners, professional typography.
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
    Analyze this message and extract job details into a JSON object.
    
    **CRITICAL: INSTRUCTION EXTRACTION**
    If the user includes specific instructions (e.g., "make it 700 words", "use a conversational tone", "bold the company name"), 
    extract them ALL perfectly into a field named 'customDirectives'.
    
    Fields to Extract:
    - title: The job title.
    - location, requirements, company, salary.
    - applyLink, applyEmail, type, interviewDate, interviewTime, interviewLocation.
    - **customDirectives**: ANY additional user requests or specific instructions.

    Message to Parse:
    "${message}"
    
    Rules:
    - Output ONLY valid JSON.
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
