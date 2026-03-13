export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FREEPIK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FREEPIK_API_KEY not configured in Vercel environment variables" });

  const { prompt, negPrompt, sizeApi, styleApi } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await fetch("https://api.freepik.com/v1/ai/text-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": apiKey,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negPrompt || "",
        num_images: 1,
        image: { size: sizeApi || "square_1_1" },
        styling: { style: styleApi || "photographic" },
        filter_nsfw: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.message || data?.error || `Freepik API error ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const base64 = data?.data?.[0]?.base64;
    if (!base64) return res.status(502).json({ error: "No image returned from Freepik" });

    return res.status(200).json({ base64 });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
