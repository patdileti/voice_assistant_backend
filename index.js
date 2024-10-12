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
const allowedOrigins = ['http://localhost:3000','https://voiceassistantapp-production.up.railway.app/']; // Replace with your allowed origin(s)
app.use(cors({
  origin: allowedOrigins,
  methods: "POST",
  credentials: true, // If you need to accept credentials (e.g., cookies, authorization headers)
}));

// Rate limiting middleware (limit to 100 requests per IP per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use(express.json());

// Endpoint to receive the transcript and generate a response
app.post(
  "/api/generate-response",
  // Validate input
  body('transcript').isString().notEmpty().withMessage('Transcript is required and should be a string.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transcript } = req.body;

    try {
      // Make a request to the OpenAI API or another provider
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: transcript }],
          max_tokens: 50,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      res.status(200).json({ response: response.data.choices[0].message.content });
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
