# 🍬 Buff BonBon Candy Store

> Cross-agent memory orchestration built on Notion Workers, Claude API, and a Notion Agent. Your AI memory layer for everything you build across Claude, ChatGPT, Gemini, DALL-E and more.

---

## What is BonBon?

Every time you do meaningful work in an AI tool — write a script in ChatGPT, build something in Claude, generate visuals in DALL-E, that's a BonBon. A moment worth remembering.

BonBon Jar is where those moments live so you never lose them.

**Built on:** Notion Workers + Claude API + Notion Agent  
**Built by:** [Sharon Jacob](https://github.com/sunshinesharon) · [The Digital Buff](https://thedigitalbuff.com)

---

## How to Set Up Your Own BonBon Jar

### Step 1 — Duplicate the Template

Click the Notion template link → hit **Duplicate** → it lands in your workspace with the full Candy Store, AI BonBon Cabinet, and all views intact.

### Step 2 — Deploy the Worker

```bash
curl -fsSL https://ntn.dev | bash
ntn workers new
```

Replace the contents of `src/index.ts` with the BonBon Worker code from this repo.

Add your environment variables:

```bash
ntn workers env set CLAUDE_API_KEY=your_claude_api_key_here
ntn workers env set NOTION_DATABASE_ID=your_database_id
ntn workers env set NOTION_API_KEY=your_notion_token
```

Then deploy:

```bash
ntn workers deploy
```

### Step 3 — Create Your BonBon Agent

In Notion → **New Agent** → name it **BonBon** → paste these instructions:

```
You are BonBon 🍬, an AI memory assistant for cross-agent work. You have access to the AI BonBon Jar database which contains everything the user has worked on across Claude, ChatGPT, Gemini, DALL-E, Higgsfield and other AI tools.

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
```

**Triggers to turn ON:**
- ✅ New chat with BonBon in Notion
- ✅ When agent is mentioned in Notion

Connect the Agent to your **AI BonBon Jar** database under **Tools and Access**.

### Step 4 — Drop Your First BonBon

Fill in three things. BonBon does the rest:

1. **BonBon Name** — what to call this memory
2. **Made In** — which AI tool you used
3. **Raw Input (Unwrapped)** — paste what you did and why it matters

> Write at least 3 sentences in Raw Input. The more context you give, the smarter BonBon's analysis will be.

---

## What BonBon Auto-Fills

| Field | What It Does |
|-------|-------------|
| Quick Bite | 2-sentence summary of what was worked on |
| Key Output | The single most valuable insight or deliverable |
| Tags (Sprinkles) | Up to 2 relevant tags |
| Evolution Stage | Where this idea is in its lifecycle |
| Importance | How significant this is to your work |
| Reusable? | Whether this output is worth returning to |
| Don't Forget This | Flagged if a deadline or urgency is detected |

---

## Keys You'll Need

| Key | Where to Get It |
|-----|----------------|
| `CLAUDE_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NOTION_API_KEY` | [notion.so/my-integrations](https://notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | Your BonBon Jar database URL |

---

Made with 🍬 by [The Digital Buff](https://thedigitalbuff.com)