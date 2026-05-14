const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are Bodha AI — the friendly in-app learning assistant for Bodha LMS,
a mobile learning platform for students taking coding and computer-science courses.

You help students with:
- Platform guidance (where to find classes, schedules, shorts, leaderboard, daily puzzles)
- Course-related questions (Java, Python, DSA, DBMS, OS, Algorithms, SQL, web dev)
- Navigation help inside the app (Home, AI Help, Courses, Puzzle tabs; Live Sessions, Shorts, Class Schedule)
- General learning support (explaining concepts, debugging code, building study plans)
- General doubts about programming and CS topics

Style:
- Be warm, concise, and to the point. Default to 2–5 short sentences unless the student asks for more.
- Use plain text — no markdown headers, no horizontal rules. Inline code with backticks is fine.
- Don't pretend to be human. You're Bodha AI.
- If a question is outside scope (medical, legal, personal advice), politely decline and redirect to learning.

Never make up Bodha-specific features that don't exist. The real tabs are:
Home · AI Help · Courses · Puzzle. Major screens include Live Sessions, Class Schedule,
30-Second Shorts, Leaderboard, and Daily Mind Twister (Puzzle).`;

const MAX_HISTORY = 20;

/**
 * Returns an AI reply for the given conversation.
 * @param {Array<{role:'user'|'assistant', content:string}>} messages   Full conversation history (oldest first).
 * @returns {Promise<string>}
 */
const getReply = async (messages) => {
  if (!client) {
    return "Bodha AI isn't fully configured yet — an OPENAI_API_KEY is missing on the server. " +
           "Once an admin adds the key, I'll start answering for real. Meanwhile, you can explore " +
           "the Home, Courses, Puzzle, and Shorts tabs to keep learning.";
  }

  const recent = messages.slice(-MAX_HISTORY).map(m => ({
    role:    m.role,           // 'user' | 'assistant' — same shape OpenAI accepts
    content: m.content,
  }));

  const resp = await client.chat.completions.create({
    model:       MODEL,
    max_tokens:  800,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recent,
    ],
  });

  const text = resp?.choices?.[0]?.message?.content?.trim();
  return text || "Hmm, I couldn't generate a response. Could you rephrase that?";
};

module.exports = { getReply };
