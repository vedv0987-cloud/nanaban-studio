// api/generate.js — Vercel Serverless Function
// Uses gemini-2.0-flash-exp generateContent — works with free AI Studio key

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, negPrompt, style, apiKey } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return res.status(400).json({ error: "No API key provided" });

  const fullPrompt = [
    `${style || "Cinematic"} photography style.`,
    prompt,
    "Ultra high quality, detailed, professional, sharp focus.",
    negPrompt ? `Do not include: ${negPrompt}.` : "",
  ].filter(Boolean).join(" ");

  try {
    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      const msg = data?.error?.message || "Generation failed";
      return res.status(googleRes.status).json({ error: msg });
    }

    // Find image part in response
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imgPart) {
      const textPart = parts.find(p => p.text);
      return res.status(500).json({
        error: textPart?.text?.slice(0, 200) || "No image returned — try a different prompt",
      });
    }

    return res.status(200).json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
