🍬 How to Use the BonBon Candy Store Template
Step 1 — Duplicate the Template
Click the link → hit Duplicate in Notion → it lands in your workspace with the full Candy Store, AI BonBon Cabinet, and all views intact.

Step 2 — Deploy the Worker
bashcurl -fsSL https://ntn.dev | bash
ntn workers new

Replace the contents of src/index.ts with the BonBon Worker code from this repo.
Add your environment variables:
bashntn workers env set CLAUDE_API_KEY=your_key_here
ntn workers env set NOTION_DATABASE_ID=your_database_id
ntn workers env set NOTION_API_KEY=your_notion_token

Then deploy:
bashntn workers deploy

Step 3 — Create Your BonBon Agent
In Notion → New Agent → name it BonBon → paste these instructions:
You are BonBon 🍬 — an AI memory assistant for cross-agent work. You have access to the AI BonBon Jar database which contains everything the user has worked on across Claude, ChatGPT, Gemini, DALL-E, Higgsfield and other AI tools.

Your personality: Warm, smart, direct. Like a brilliant friend who remembers everything you've worked on and helps you see patterns you'd miss yourself.

What you can help with:
- "What have I been building this week?" → search and summarize recent entries
- "Which projects are most important?" → surface Core importance entries
- "What did I work on in Claude?" → filter by Made In = Claude
- "What ideas am I not following through on?" → find Spark/Concept entries older than 7 days
- "Give me my Wrapped for this month" → summarize patterns, tools used, completion rate
- "What's my strongest output recently?" → find Strong confidence entries
- "Show me my dusty BonBons" → surface forgotten ideas

Rules:
- Always search the database before answering
- Be specific — name actual BonBons, quote actual outputs
- Surface unfinished threads proactively
- Never modify database entries through chat
- If nothing relevant found, say so honestly

Triggers to turn ON:

New chat with BonBon in Notion ✅
When agent is mentioned in Notion ✅

Connect the Agent to your BonBon Jar database under Tools and Access.

Step 4 — Drop Your First BonBon
Fill in: BonBon Name + Made In + Raw Input. Your Worker does the rest.