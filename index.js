const express = require("express");
const cors = require("cors");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Use Helmet to secure HTTP headers
app.use(helmet());

// Configure CORS to allow only certain origins
const allowedOrigins = ['http://localhost:3000','https://voiceassistantapp-production.up.railway.app'];
app.use(cors({
  origin: allowedOrigins,
  methods: "POST",
  credentials: false,
}));

// Rate limiting middleware (limit to 100 requests per IP per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use(express.json());

// In-memory store for conversation history (in a production environment, use a database)
const conversationHistory = new Map();

// Endpoint to receive the transcript and generate a response
app.post(
  "/api/generate-response",
  // Validate input
  body('transcript').isString().notEmpty().withMessage('Transcript is required and should be a string.'),
  body('sessionId').isString().notEmpty().withMessage('SessionId is required and should be a string.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transcript, sessionId } = req.body;

    // Log received data for debugging
    console.log("Received transcript:", transcript);
    console.log("Received sessionId:", sessionId);

    // Get or initialize conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }
    const history = conversationHistory.get(sessionId);

    // Prepare the messages array for OpenAI API
    const messages = [
      { role: "system", content: "You are a helpful assistant. Please respond briefly and directly." },
      ...history,
      { role: "user", content: transcript }
    ];

    console.log("Sending messages to OpenAI:", messages);

    try {
      // Make a request to the OpenAI API
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const assistantResponse = response.data.choices[0].message.content;

      // Update conversation history
      history.push({ role: "user", content: transcript });
      history.push({ role: "assistant", content: assistantResponse });

      // Limit history to last 10 messages (5 exchanges) to prevent token limit issues
      if (history.length > 10) {
        history.splice(0, 2);
      }

      res.status(200).json({ response: assistantResponse });
    } catch (error) {
      console.error(
        "Error generating response: ",
        error.response ? error.response.data : error.message
      );
      res.status(500).send("Internal server error.");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});