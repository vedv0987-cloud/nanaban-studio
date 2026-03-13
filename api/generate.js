// api/generate.js — Freepik Mystic API proxy
// POST /api/generate → creates task → polls until COMPLETED → returns image URL

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, negPrompt, aspectRatio, resolution, model, apiKey } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  const key = apiKey || process.env.FREEPIK_API_KEY;
  if (!key) return res.status(400).json({ error: "No Freepik API key provided" });

  const headers = {
    "Content-Type": "application/json",
    "x-freepik-api-key": key,
  };

  // ── Step 1: Create task ────────────────────────────────────
  let taskId;
  try {
    const body = {
      prompt,
      aspect_ratio: aspectRatio || "square_1_1",
      resolution:   resolution  || "2k",
      model:        model       || "realism",
      filter_nsfw:  true,
      fixed_generation: false,
    };

    const createRes = await fetch("https://api.freepik.com/v1/ai/mystic", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      return res.status(createRes.status).json({
        error: createData?.message || createData?.error || "Failed to create task",
      });
    }

    taskId = createData?.data?.task_id;
    if (!taskId) return res.status(500).json({ error: "No task_id returned" });

  } catch (e) {
    return res.status(500).json({ error: "Create task error: " + e.message });
  }

  // ── Step 2: Poll until COMPLETED (max 60s) ─────────────────
  const MAX_ATTEMPTS = 20;
  const INTERVAL_MS  = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, INTERVAL_MS));

    try {
      const pollRes  = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, { headers });
      const pollData = await pollRes.json();
      const status   = pollData?.data?.status;

      if (status === "COMPLETED") {
        const imageUrl = pollData?.data?.generated?.[0];
        if (!imageUrl) return res.status(500).json({ error: "No image in completed task" });
        return res.status(200).json({ image: imageUrl, task_id: taskId });
      }

      if (status === "FAILED" || status === "ERROR") {
        return res.status(500).json({ error: "Freepik task failed", task_id: taskId });
      }

      // IN_PROGRESS / CREATED — keep polling

    } catch (e) {
      return res.status(500).json({ error: "Poll error: " + e.message });
    }
  }

  return res.status(504).json({ error: "Timed out after 60s — try again", task_id: taskId });
}
