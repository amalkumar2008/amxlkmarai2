import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are Mallu AI, a friendly Kerala-focused AI assistant.
Understand and respond naturally in Malayalam, Manglish, and English.
Match the user's language where practical.
Be helpful, respectful, concise, culturally aware, and honest about uncertainty.
You can help with Kerala food, travel, culture, Malayalam/Manglish, education,
coding, technology, and general questions.
Do not claim access to information or abilities you do not have.
For high-stakes medical, legal, or financial topics, provide general information
and recommend an appropriate qualified professional.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel."
    });
  }

  try {
    const inputMessages = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    const messages = inputMessages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 12000),
      }));

    if (!messages.length || messages.at(-1).role !== "user") {
      return res.status(400).json({
        error: "Please send a valid message."
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: messages,
      max_output_tokens: Number(process.env.MAX_OUTPUT_TOKENS || 1200),
    });

    return res.status(200).json({
      reply:
        response.output_text ||
        "Sorry da, I couldn't generate a reply."
    });
  } catch (error) {
    console.error(error);

    if (error?.status === 401) {
      return res.status(401).json({
        error: "Invalid OpenAI API key."
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({
        error: "OpenAI quota or rate limit reached."
      });
    }

    return res.status(500).json({
      error: "Mallu AI could not reach the AI service."
    });
  }
}
