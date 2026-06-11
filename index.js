const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const REPLICATE_TOKEN = process.env.REPLICATE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const SYSTEM_PROMPT = `You are a friendly customer service and sales assistant for Amarachi Godwin, a Nigerian digital entrepreneur. Answer questions about her products, nurture leads and guide them to purchase.

PRODUCTS:
1. TikTok UK Cheat Code - NGN 5000 on Selar. Teaches Nigerians to create and monetize a UK TikTok account.
2. Revolutionary Health Hack - http://Healthhacks.selar.com/9wdt?affiliate=eqdm
3. Fitness Psychology - http://selar.com/215811?affiliate=hhp7
4. Cent's Fitness HIIT for Women - https://selar.com/p/3i7x49?affiliate=yunr
5. Financial Fitness Challenge - http://thecoach.selar.com/f4d112y821?affiliate=ldqe
6. Easy Diet Solution - https://selar.com/p/154824?affiliate=u8x1

RULES:
- Be warm, friendly and conversational
- Give value first before recommending products
- Always include purchase link when recommending
- Keep replies short and WhatsApp-friendly
- Handle objections with empathy
- Never be pushy`;

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Amarachi Bot Server is running!" });
});

// WhatsApp webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp webhook handler
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message || message.type !== "text") return;

    const from = message.from;
    const text = message.text.body;

    const aiResponse = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const reply = aiResponse.data.content[0].text;

    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
});

// Video generation proxy
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await axios.post(
      "https://api.replicate.com/v1/models/minimax/video-01/predictions",
      { input: { prompt, duration: 6 } },
      {
        headers: {
          Authorization: `Token ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Poll video status
app.get("/video-status/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.replicate.com/v1/predictions/${req.params.id}`,
      { headers: { Authorization: `Token ${REPLICATE_TOKEN}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
