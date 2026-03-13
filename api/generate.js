// api/generate.js  —  Vercel Serverless Function
// Place this file at:  /api/generate.js  in your repo root

export default async function handler(req, res) {
  // CORS headers — allow your Vercel domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, negPrompt, aspectRatio, apiKey } = req.body || {};

  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  // Use key from request body, fallback to Vercel env var
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return res.status(400).json({ error: "No API key. Set GEMINI_API_KEY in Vercel env vars or paste in the app." });

  try {
    const body = {
      instances: [{
        prompt: negPrompt
          ? `${prompt}. Avoid: ${negPrompt}`
          : prompt,
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio || "1:1",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult",
        enhancePrompt: true,
      },
    };

    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      const msg = data?.error?.message || "Generation failed";
      return res.status(googleRes.status).json({ error: msg });
    }

    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    const mimeType = data?.predictions?.[0]?.mimeType || "image/png";
    if (!b64) return res.status(500).json({ error: "No image in response" });

    return res.status(200).json({ image: `data:${mimeType};base64,${b64}` });

  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
