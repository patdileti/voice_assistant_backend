const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Endpoint para recibir la transcripción y generar respuesta
app.post("/api/generate-response", async (req, res) => {
  const { transcript } = req.body;

  try {
    // Hacer una solicitud a la API de OpenAI u otro proveedor
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

    res
      .status(200)
      .json({ response: response.data.choices[0].message.content });
  } catch (error) {
    console.error(
      "Error al generar respuesta: ",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .send(
        "Error interno del servidor: " +
          (error.response ? error.response.data : error.message)
      );
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});