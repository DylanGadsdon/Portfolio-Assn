// server/ai.js — writes a short summary of a post using an AI model via OpenRouter.
//
// Why this runs on the server, not in the browser:
// the API key must stay secret. If it were in browser code, anyone could
// open DevTools, copy it and spend your credits.
//
// What we send:  the model name + a "system" message (instructions) + a "user"
//                message (the post itself).
// What we get:   JSON. The text is at data.choices[0].message.content.

const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || '~anthropic/claude-sonnet-latest';

export async function summarise(title, body) {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('No OPENROUTER_API_KEY set; skipping AI summary.');
    return null;
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'The Logbook',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 120,          // a hard cap on reply length (and cost)
      temperature: 0.4,         // lower = more predictable, less "creative"
      messages: [
        {
          role: 'system',
          content:
            'You summarise blog posts for a creative portfolio journal. ' +
            'Write ONE or TWO plain sentences, max 40 words, in the same language as the post. ' +
            'Third person is not needed; write it as a neutral teaser. ' +
            'No headings, no quotes, no emojis, no preamble like "This post".',
        },
        { role: 'user', content: `Title: ${title}\n\n${body}` },
      ],
    }),
    signal: AbortSignal.timeout(20000),   // give up after 20 seconds
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
