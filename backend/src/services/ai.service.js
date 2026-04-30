const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const getResponse = async (question, session) => {
  const systemPrompt = `You are an educational AI assistant for a live learning session.
Session topic: "${session.title} - ${session.subtitle || ''}".
Category: ${session.category}.
${session.aiTopicContext ? `Context: ${session.aiTopicContext}` : ''}

Your role:
- Explain concepts clearly and concisely
- Answer doubts related to the session topic
- Provide code examples when helpful
- Stay within the session topic scope
- Tone: ${session.aiResponseTone || 'friendly and educational'}

If the question is completely unrelated to the topic, gently redirect the student.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  });

  return message.content[0].text;
};

module.exports = { getResponse };
