# Blogger & WordPress Publisher Bot

This bot automates the creation and editing of SEO-friendly content on Blogger and WordPress using AI. It supports generating **Job Posts**, **Knowledge Base** articles, **Other** (general articles/news), and **All** (mixed content style).

## 🚀 How It Works

The bot follows a 4-step process to transform a simple message into a professional blog post:

1.  **📊 Data Input**: You provide job details either via the **CLI**, a **JSON batch file**, or by sending a **WhatsApp message** starting with `!publish`.
2.  **🧠 AI Parsing**: The bot uses AI (via OpenRouter or Gemini) to analyze your unstructured text and extract key details like Job Title, Location, Salary, Requirements, and Interview details. It even captures **custom directives** (e.g., "make it 700 words", "use a conversational tone") and applies them!
3.  **✍️ Content Generation**: The AI then generates a highly optimized, SEO-friendly HTML blog post using a premium, mobile-responsive design template. It dynamically selects from 4 different writing styles (Corporate, Friendly, Energetic, Storytelling) to keep content fresh.
4.  **📝 Publishing**: Finally, the bot uses the respective API to create a draft (or a live post) on your blog, complete with labels and direct application links.

### ✨ Key Features
- **CLI & WhatsApp Interfaces**: Manage posts from your terminal or directly from your phone.
- **Context-Aware Chat**: The WhatsApp bot remembers your previous messages in a session, allowing you to refine job posts conversationally.
- **Custom Prompts/Directives**: Instruct the AI directly in your message to change the output style or length.
- **Batch Processing**: Feed a JSON file of multiple posts to publish them all at once safely.
- **Full CRUD Support**: Publish, List, Edit, and Delete posts from the command line or WhatsApp.
- **4 AI Writing Styles**: Professional & Corporate, Friendly & Engaging, Dynamic & Energetic, Storytelling.
- **Rich HTML Output**: Generates modern gradients, rounded corners, professional typography, and mobile-friendly layouts inline.## Setup

1. **Install dependencies**:
   ```bash
   cd blogger-publisher-bot
   npm install
   ```

2. **Configure Environment Variables**:
   Rename `.env.example` to `.env` and fill in your credentials:
   - `OPENROUTER_API_KEY`: Get it from [OpenRouter](https://openrouter.ai/).
   - `BLOG_ID`: Your Blogger Blog ID.
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Get these from [Google Cloud Console](https://console.cloud.google.com/). Enable "Blogger API v3" and create "OAuth 2.0 Client ID" for a Web Application. Add `http://localhost:3000/oauth2callback` as an Authorized Redirect URI.

3. **Get Refresh Token**:
   Run the helper to authorize the bot:
   ```bash
   node auth-helper.js
   ```
   Open the link, follow the prompts, and copy the `REFRESH_TOKEN` into your `.env` file.
   
   *Alternative:* If you configured the redirect URI as `urn:ietf:wg:oauth:2.0:oob`, you can use the interactive token generator:
   ```bash
   node get_token.js
   ```

## Usage

### Publish a New Job Draft
```bash
node publisher.js publish "Full Stack Developer" "Remote" "Node.js, React, 3+ years experience" "Tech Corp" "$120k - $150k" --labels "Tech, Remote" --link "https://example.com/apply"
```
Or with an email:
```bash
node publisher.js publish "Frontend Dev" "Dubai" "React" --date "Oct 25" --time "10 AM" --venue "Office 402, Business Bay"
```

*Note: Salary and Company are optional. If you want to skip them but use positional arguments, use "N/A" or just use flags for other details.*

Add `--publish` flag to publish directly instead of drafting.

### Batch Publish from JSON
Create a `.json` file (see `jobs.json` example in project) and run:
```bash
node publisher.js batch data.json
```
Add `--publish` to publish all posts in the batch.

*💡 Pro Tip: You can specify a `"type"` field in your JSON objects (e.g., `"type": "job"`, `"type": "knowledge_base"`, `"type": "other"`, or `"type": "all"`) to guide the AI to generate the right content format.*

### List Recent Posts
```bash
node publisher.js list 10
```

### Delete a Post
```bash
node publisher.js delete <POST_ID>
```

### WhatsApp Bot Integration
You can also run the bot via WhatsApp. This allows you to send rough job details via text and have the bot automatically parse and draft them.

1. **Start the Bot**:
   ```bash
   node whatsapp-bot.js
   ```
2. **Login**: Scan the QR code that appears in your terminal, or head to `http://localhost:3000/qr`. You can also use a Pairing Code if you set `PAIRING_NUMBER` in your `.env`.
3. **Usage**: Send a message to the bot (or in a group where the bot is present) starting with `!publish`.
   *Example*: `!publish Hiring a Junior Designer in Mumbai. Must know Figma. Salary 50k. Email hr@design.com. Make it sound very energetic!`

**WhatsApp Commands:**
- `!publish <Details>`: Create a new post.
- `!edit <POST_ID> <New Details>`: Edit an existing post dynamically.
- `!list`: List recent posts right in WhatsApp.
- `!new` or `!reset`: Clear your session context if you want to start a completely fresh post without carrying over details.
- `!help`: Show commands.
- `!ping`: Health check.

---

### Edit an Existing Post
```bash
node publisher.js edit <POST_ID> "Senior Backend Developer" "San Francisco" "Go, Kubernetes, Distributed Systems" "Cloud Scale" "$180k+"
```
This will fetch the existing post, regenerate SEO content based on new details, and update the post on Blogger.
