// api/generate.js — Vercel Serverless Function
// Auto-discovers the correct image generation model for the given API key

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

  // ── Step 1: discover available models ──────────────────────
  let imageModel = null;
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
    );
    const listData = await listRes.json();
    if (!listRes.ok) {
      return res.status(listRes.status).json({ error: listData?.error?.message || "Invalid API key" });
    }

    const models = listData?.models || [];

    // Priority list — first match wins
    const CANDIDATES = [
      "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    // Find a model that supports generateContent AND image output
    for (const candidate of CANDIDATES) {
      const found = models.find(m =>
        m.name?.includes(candidate) &&
        m.supportedGenerationMethods?.includes("generateContent")
      );
      if (found) {
        imageModel = found.name.replace("models/", "");
        break;
      }
    }

    // Fallback: any model with generateContent that has "flash" in name
    if (!imageModel) {
      const fallback = models.find(m =>
        m.name?.includes("flash") &&
        m.supportedGenerationMethods?.includes("generateContent")
      );
      if (fallback) imageModel = fallback.name.replace("models/", "");
    }

    if (!imageModel) {
      return res.status(500).json({
        error: `No compatible model found. Available: ${models.map(m=>m.name).join(", ")}`,
      });
    }
  } catch (e) {
    return res.status(500).json({ error: "Failed to list models: " + e.message });
  }

  // ── Step 2: generate image ──────────────────────────────────
  const fullPrompt = [
    `${style || "Cinematic"} photography style.`,
    prompt,
    "Ultra high quality, detailed, professional, sharp focus.",
    negPrompt ? `Do not include: ${negPrompt}.` : "",
  ].filter(Boolean).join(" ");

  try {
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    const data = await genRes.json();

    if (!genRes.ok) {
      const msg = data?.error?.message || "Generation failed";
      // If this model doesn't support image output, report it clearly
      if (msg.includes("responseModalities") || msg.includes("IMAGE")) {
        return res.status(500).json({
          error: `Model '${imageModel}' doesn't support image generation. Your key may need billing enabled for image-capable models.`,
        });
      }
      return res.status(genRes.status).json({ error: msg });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imgPart) {
      const textPart = parts.find(p => p.text);
      return res.status(500).json({
        error: `Model '${imageModel}' returned no image. Response: ${textPart?.text?.slice(0,150) || "empty"}`,
      });
    }

    return res.status(200).json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
      model: imageModel,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
