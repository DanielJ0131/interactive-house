import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Add it to .env file",
      });
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: String(message) }],
          },
        ],
      }),
    });

    const data = await geminiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.error?.message ||
      "";

    if (!reply) {
      return res.status(500).json({
        error: "Empty reply from Gemini",
        raw: data,
      });
    }

    res.json({ reply });
  } catch (e) {
    console.error("GEMINI ERROR:", e);
    res.status(500).json({
      error: "AI request failed",
      details: e?.message || "unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`AI backend running on http://localhost:${port}`);
});
