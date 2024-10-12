const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint para recibir la transcripción y generar respuesta
app.post("/api/generate-response", async (req, res) => {
  const { threadId, transcript } = req.body;

  try {
    // Crear un nuevo thread si no existe
    let thread;
    if (!threadId) {
      thread = await openai.beta.threads.create();
    } else {
      thread = { id: threadId };
    }

    // Agregar el mensaje del usuario al thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: transcript,
    });

    // Ejecutar el asistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_pkBah6gVeIVkiAmN96vnuS5A",
    });

    // Esperar a que el asistente termine de procesar
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Obtener la respuesta del asistente
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantResponse = messages.data[0].content[0].text.value;

    res.status(200).json({ response: assistantResponse, threadId: thread.id });
  } catch (error) {
    console.error("Error al generar respuesta: ", error);
    res.status(500).send("Error interno del servidor: " + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});