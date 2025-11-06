const path = require("node:path");
const fs = require("node:fs/promises");
const ApiError = require("../api-error");
const JSend = require("../jsend");

const OUTPUT_DIR = path.join(__dirname, "../../public/virtual-tryon");
const DEFAULT_PROMPT =
  "Create a professional e-commerce fashion photo with aspect ratio 3:4. Take the clothes from the first image and let the person from the second image wear it. Generate a realistic, full-body shot of the person wearing the clothes while keeping the model's face clear.";

async function loadClient() {
  try {
    const module = await import("@google/genai");
    if (module?.GoogleGenAI) return module.GoogleGenAI;
    if (module?.default?.GoogleGenAI) return module.default.GoogleGenAI;
    throw new Error("Missing GoogleGenAI export");
  } catch (error) {
    throw new ApiError(
      500,
      "Failed to load Google GenAI client – make sure '@google/genai' is installed"
    );
  }
}

async function generateVirtualTryOn(req, res, next) {
  try {
    const garmentFile = req.files?.garmentImage?.[0];
    const modelFile = req.files?.modelImage?.[0];

    if (!garmentFile || !modelFile) {
      throw new ApiError(
        400,
        "Both garmentImage and modelImage uploads are required"
      );
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        500,
        "Missing GOOGLE_GENAI_API_KEY in environment configuration"
      );
    }

    const GoogleGenAI = await loadClient();
    const ai = new GoogleGenAI({ apiKey });

    const background =
      typeof req.body?.background === "string"
        ? req.body.background.trim()
        : "";
    const timeOfDay =
      typeof req.body?.time === "string" ? req.body.time.trim() : "";
    const extraPrompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    const promptParts = [DEFAULT_PROMPT];

    if (background) {
      promptParts.push(
        `Place the subject in a ${background.toLowerCase()} setting and ensure the background clearly reflects that environment.`
      );
    }
    if (timeOfDay) {
      promptParts.push(
        `Adjust lighting, shadows, and ambience to match approximately ${timeOfDay}.`
      );
    }
    if (extraPrompt) {
      promptParts.push(extraPrompt);
    }

    const promptText = promptParts.join(" ");
    const modelId =
      req.body?.modelId ||
      process.env.GOOGLE_GENAI_MODEL_ID ||
      "gemini-2.5-flash-image";

    const contents = [
      {
        inlineData: {
          mimeType: garmentFile.mimetype || "image/png",
          data: garmentFile.buffer.toString("base64"),
        },
      },
      {
        inlineData: {
          mimeType: modelFile.mimetype || "image/png",
          data: modelFile.buffer.toString("base64"),
        },
      },
      { text: promptText },
    ];

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelId,
        contents,
        config: {
          numberOfImages: 4,
        },
      });
    } catch (err) {
      throw new ApiError(
        502,
        err?.message || "Failed to generate try-on image from AI service"
      );
    }

    const parts = response?.candidates?.[0]?.content?.parts || [];
    let generatedBuffer = null;
    const notes = [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedBuffer = Buffer.from(part.inlineData.data, "base64");
      } else if (part.text) {
        notes.push(part.text);
      }
    }

    if (!generatedBuffer) {
      throw new ApiError(
        502,
        "AI service did not return an image. Try again with different inputs."
      );
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const fileName = `virtual_tryon_${Date.now()}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    await fs.writeFile(filePath, generatedBuffer);

    const imageUrl = `/public/virtual-tryon/${fileName}`;
    const payload = {
      imageUrl,
      prompt: promptText,
    };

    if (background) {
      payload.background = background;
    }
    if (timeOfDay) {
      payload.time = timeOfDay;
    }
    if (notes.length) {
      payload.notes = notes;
    }

    return res.status(201).json(JSend.success(payload));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateVirtualTryOn,
};
