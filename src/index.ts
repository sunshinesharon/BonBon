import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { WebhookEvent } from "@notionhq/workers";

const worker = new Worker();
export default worker;

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY!;
const NOTION_API_KEY = process.env.NTN_API_KEY!;
const DATABASE_ID = process.env.DATABASE_ID!;

// Helper: Notion REST API
async function notionFetch(method: string, path: string, body?: object) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    ...(body && { body: JSON.stringify(body) })
  });
  return res.json();
}

// Helper: Claude API
async function askClaude(prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json() as any;
  return data.content[0].text;
}

// ============================================
// WEBHOOK: Fires when new BonBon is added
// ============================================
worker.webhook("intake", {
  title: "BonBon Intake",
  description: "Processes new BonBon entries and auto-fills all fields using Claude",
  execute: async (events: WebhookEvent[]): Promise<void> => {
    for (const event of events) {
      try {
        const body = event.body as any;
        const pageId = body.data?.id || body.id;
        console.log("PAGE ID:", pageId);
        if (!pageId) continue;

        const page = await notionFetch("GET", `pages/${pageId}`) as any;
        const rawInput = page.properties?.["Raw Input (Unwrapped)"]?.rich_text?.[0]?.plain_text || "";
        const madeIn = page.properties?.["Made In"]?.select?.name || "Unknown";
        const existingName = page.properties?.["BonBon Name"]?.title?.[0]?.plain_text || "";
        console.log("RAW INPUT:", rawInput);

        if (!rawInput) continue;
        const comments = await notionFetch("GET", `comments?block_id=${pageId}`) as any;
        const commentText = (comments.results || [])
        .map((c: any) => c.rich_text?.[0]?.plain_text || "")
        .join(" ");

        const recent = await notionFetch("POST", `databases/${DATABASE_ID}/query`, {
          page_size: 20,
          sorts: [{ timestamp: "created_time", direction: "descending" }]
        }) as any;
        console.log("RECENT:", JSON.stringify(recent).slice(0, 100));

        const recentBonBons = (recent.results || [])
          .filter((p: any) => p.id !== pageId)
          .map((p: any) => ({
            id: p.id,
            name: p.properties["BonBon Name"]?.title?.[0]?.plain_text || "",
            tags: p.properties["Tags (Sprinkles)"]?.multi_select?.map((t: any) => t.name) || []
          }))
          .slice(0, 10);

        const claudeResponse = await askClaude(`You are BonBon, an AI memory analyst.

A new memory was logged from ${madeIn}. Return ONLY valid JSON, no extra text. Maximum 2 tags, only if clearly relevant:

{
  "bonbon_name": "clear 5-7 word title",
  "quick_bite": "2 sentence summary of what was worked on and why it matters",
  "prize_inside": "the single most valuable output or insight",
  "tags": ["tag1", "tag2"] — maximum 2 specific descriptive tags based on the content. Use the user's own terminology where possible. Otherwise empty array.
  "evolution_stage": "one of exactly: ✨ Spark (idea only, nothing made), 💡 Concept (developed idea, not started), ✏️ Draft (in progress, not finished), ⚙️ Execution (actively working on it), 🚀 Published (shipped, live, shared publicly), 📦 Archived (abandoned or done). If Raw Input mentions a live URL, shipped product, or completed deliverable choose 🚀 Published.",
  "importance": "one of exactly: 🔴 Core, 🟡 Supporting, 🔵 Reference, ⚫ Archive",
  "worth_making_again": true or false,
  "needs_followup": true if deadline or time-sensitive element mentioned otherwise false,
  "improvement_tip": "if the output seems vague or incomplete write one sentence on what additional detail would make this memory more actionable. Otherwise empty string."
}

Recent BonBons for context:
${JSON.stringify(recentBonBons)}

Additional context from comments:
${commentText}

Content to analyze:
${rawInput}`);

        console.log("CLAUDE:", claudeResponse.slice(0, 200));
        const cleaned = claudeResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extracted = JSON.parse(cleaned);

        await notionFetch("PATCH", `pages/${pageId}`, {
          properties: {
            "BonBon Name": { title: [{ text: { content: existingName || extracted.bonbon_name }}]},
            "Quick Bite": { rich_text: [{ text: { content: extracted.quick_bite }}]},
            "Tags (Sprinkles)": { multi_select: extracted.tags.map((t: string) => ({ name: t }))},
            "Evolution Stage": { select: { name: extracted.evolution_stage }},
            "Importance": { select: { name: extracted.importance }},
            "Reusable?": { checkbox: extracted.worth_making_again },
            "Don't Forget This (Follow Up)": { checkbox: extracted.needs_followup },
            "Key Output": { rich_text: [{ text: { content: extracted.prize_inside + (extracted.improvement_tip ? " 💡 " + extracted.improvement_tip :"")}}]},
          }
        });
        console.log("DONE");

      } catch(e) {
        console.log("TOP LEVEL ERROR:", String(e));
      }
    }
   }
  });

// ============================================
// AGENT TOOL: Search Memory
// ============================================
worker.tool("searchMemory", {
  title: "Search BonBon Memory",
  description: "Search all logged AI memories. Use when asked about past work, projects, ideas, or which tool was used for something.",
  schema: j.object({
    query: j.string().describe("What to search for — topic, project name, or question about past work")
  }),
  execute: async ({ query }) => {
    const response = await notionFetch("POST", `databases/${DATABASE_ID}/query`, {
      page_size: 50,
      sorts: [{ timestamp: "created_time", direction: "descending" }]
    }) as any;

    const bonbons = (response.results || []).map((page: any) => ({
      name: page.properties["BonBon Name"]?.title?.[0]?.plain_text || "",
      madeIn: page.properties["Made In"]?.select?.name || "",
      quickBite: page.properties["Quick Bite"]?.rich_text?.[0]?.plain_text || "",
      prizeInside: page.properties["Key Output"]?.rich_text?.[0]?.plain_text || "",
      stage: page.properties["Evolution Stage"]?.select?.name || "",
      tags: page.properties["Tags (Sprinkles)"]?.multi_select?.map((t: any) => t.name) || [],
      date: new Date(page.created_time).toLocaleDateString()
    }));

    return await askClaude(`You are BonBon, an AI memory assistant with warm intelligent energy.

The user is asking: "${query}"

Search their logged memories and give a clear narrative answer. Reference actual BonBon names. Show chronology where relevant. Surface unfinished threads.

BonBons:
${JSON.stringify(bonbons, null, 2)}`);
  }
});

// ============================================
// AGENT TOOL: Reconstruct Thread
// ============================================
worker.tool("reconstructThread", {
  title: "Reconstruct Memory Thread",
  description: "Traces the full evolution of an idea or project across all AI tools from spark to execution.",
  schema: j.object({
    topic: j.string().describe("The project, idea or campaign to trace")
  }),
  execute: async ({ topic }) => {
    const response = await notionFetch("POST", `databases/${DATABASE_ID}/query`, {
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "ascending" }]
    }) as any;

    const bonbons = (response.results || []).map((page: any) => ({
      name: page.properties["BonBon Name"]?.title?.[0]?.plain_text || "",
      madeIn: page.properties["Made In"]?.select?.name || "",
      quickBite: page.properties["Quick Bite"]?.rich_text?.[0]?.plain_text || "",
      stage: page.properties["Evolution Stage"]?.select?.name || "",
      tags: page.properties["Tags (Sprinkles)"]?.multi_select?.map((t: any) => t.name) || [],
      date: new Date(page.created_time).toLocaleDateString()
    }));

    return await askClaude(`You are BonBon. Reconstruct the full story of how "${topic}" developed across AI tools.

Tell it as a timeline:
- When it started and in which tool
- How it evolved through different systems
- What stage it is at now
- Any unfinished threads worth returning to

All BonBons chronologically:
${JSON.stringify(bonbons, null, 2)}`);
  }
});

// ============================================
// AGENT TOOL: Dusty BonBons
// ============================================
worker.tool("getDustyBonBons", {
  title: "Get Dusty BonBons",
  description: "Surfaces forgotten ideas sitting untouched for 14+ days that deserve a second look.",
  schema: j.object({}),
  execute: async () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const response = await notionFetch("POST", `databases/${DATABASE_ID}/query`, {
      page_size: 100,
      filter: {
        and: [
          { property: "Evolution Stage", select: { does_not_equal: "🚀 Published" }},
          { property: "Evolution Stage", select: { does_not_equal: "📦 Archived" }}
        ]
      }
    }) as any;

    const dusty = (response.results || [])
      .filter((page: any) => new Date(page.created_time) < twoWeeksAgo)
      .map((page: any) => ({
        name: page.properties["BonBon Name"]?.title?.[0]?.plain_text || "",
        madeIn: page.properties["Made In"]?.select?.name || "",
        quickBite: page.properties["Quick Bite"]?.rich_text?.[0]?.plain_text || "",
        stage: page.properties["Evolution Stage"]?.select?.name || "",
        date: new Date(page.created_time).toLocaleDateString()
      }));

    if (dusty.length === 0) return "Your jar is fresh! No dusty BonBons found. 🍬";

    return await askClaude(`You are BonBon. Surface these forgotten ideas with warmth and encouragement. For each give a 1-2 sentence reminder and gentle nudge.

Dusty BonBons:
${JSON.stringify(dusty, null, 2)}`);
  }
});

// ============================================
// AGENT TOOL: BonBon Wrapped
// ============================================
worker.tool("getBonBonWrapped", {
  title: "Generate BonBon Wrapped",
  description: "Generates a Spotify Wrapped-style intelligence report of AI usage patterns and creative themes.",
  schema: j.object({
    period: j.string().describe("Time period — e.g. 'this month', 'last 30 days', 'this quarter'")
  }),
  execute: async ({ period }) => {
    const response = await notionFetch("POST", `databases/${DATABASE_ID}/query`, {
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }]
    }) as any;

    const bonbons = (response.results || []).map((page: any) => ({
      name: page.properties["BonBon Name"]?.title?.[0]?.plain_text || "",
      madeIn: page.properties["Made In"]?.select?.name || "",
      stage: page.properties["Evolution Stage"]?.select?.name || "",      
      tags: page.properties["Tags (Sprinkles)"]?.multi_select?.map((t: any) => t.name) || [],
      worthMakingAgain: page.properties["Reusable?"]?.checkbox || false,
      date: new Date(page.created_time).toLocaleDateString()
    }));

    return await askClaude(`You are BonBon generating a Spotify Wrapped report for ${period}.

Include:
🛠️ Most used AI tools ranked
⭐ Strongest outputs by confidence
🎨 Top creative themes
📈 Idea completion rate Spark → Published
🌊 Biggest creative threads
🔮 One recommendation for next period

BonBons:
${JSON.stringify(bonbons, null, 2)}`);
  }
});