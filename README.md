# Blogger Publisher Bot

This bot automates the creation and editing of SEO-friendly job posts on Blogger using AI.

## 🚀 How It Works

The bot follows a 4-step process to transform a simple message into a professional blog post:

1.  **📊 Data Input**: You provide job details either via the **CLI** or by sending a **WhatsApp message** starting with `!publish`.
2.  **🧠 AI Parsing**: The bot uses AI (via OpenRouter) to analyze your unstructured text and extract key details like Job Title, Location, Salary, Requirements, and Interview details.
3.  **✍️ Content Generation**: The AI then generates a highly optimized, SEO-friendly HTML blog post using a premium, mobile-responsive design template.
4.  **📝 Blogger Publishing**: Finally, the bot uses the Google Blogger API to create a draft (or a live post) on your blog, complete with labels and direct application links.

## Setup

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
Create a `jobs.json` file (see example in project) and run:
```bash
node publisher.js batch jobs.json
```
Add `--publish` to publish all posts in the batch.

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
2. **Login**: Scan the QR code that appears in your terminal.
3. **Usage**: Send a message to the bot (or in a group where the bot is present) starting with `!publish`.
   *Example*: `!publish Hiring a Junior Designer in Mumbai. Must know Figma. Salary 50k. Email hr@design.com`

---

### Edit an Existing Post
```bash
node publisher.js edit <POST_ID> "Senior Backend Developer" "San Francisco" "Go, Kubernetes, Distributed Systems" "Cloud Scale" "$180k+"
```
This will fetch the existing post, regenerate SEO content based on new details, and update the post on Blogger.
