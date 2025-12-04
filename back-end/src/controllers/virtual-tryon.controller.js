const path = require("node:path");
const fs = require("node:fs/promises");
const ApiError = require("../api-error");
const JSend = require("../jsend");
const historyService = require("../services/history.service");

const OUTPUT_DIR = path.join(__dirname, "../../public/virtual-tryon");
const DEFAULT_PROMPT =
  "Create a professional e-commerce fashion photo with aspect ratio 3:4. Take the clothes from the first image and let the person from the second image wear it. Generate a realistic, full-body shot of the person wearing the clothes while keeping the model's face clear.";
const DEFAULT_VIDEO_PROMPT = `The video is in a vertical rectangular frame, opening with an eye-level shot focused on the person in the image, keeping the same outfit they are currently wearing.
They walk with a calm, confident grace against the existing background of the photo. The camera slowly pulls back into a wide shot, gradually revealing the spectacular scene as they turn around in a full spin.
The cinematic atmosphere is heightened by the vibrant colors of the outfit contrasting with the surroundings, capturing a pure moment of elegance and high-fashion, dreamlike beauty.`;
const VIDEO_POLL_INTERVAL_MS =
  Number(process.env.VIRTUAL_TRYON_VIDEO_POLL_INTERVAL_MS) || 10000;
const VIDEO_POLL_MAX_ATTEMPTS =
  Number(process.env.VIRTUAL_TRYON_VIDEO_POLL_MAX_ATTEMPTS) || 30;
const VIDEO_FILE_EXTENSION = ".mp4";
const SAFE_IMAGE_PREFIX = "/public/virtual-tryon/";

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

function detectMimeType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function resolveGeneratedImagePath(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith(SAFE_IMAGE_PREFIX)) {
    throw new ApiError(400, "imageUrl must reference a generated try-on result");
  }
  const relative = imageUrl.replace(/^\/+/, "");
  const candidate = path.normalize(
    path.join(__dirname, "../../", relative || "")
  );
  if (!candidate.startsWith(OUTPUT_DIR)) {
    throw new ApiError(400, "Invalid image path provided");
  }
  return candidate;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

async function generateVirtualTryOnVideo(req, res, next) {
  try {
    const { imageUrl, historyId, prompt, videoModelId } = req.body || {};
    if (!imageUrl) {
      throw new ApiError(
        400,
        "imageUrl of the generated try-on result is required to create a video"
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

    const imagePath = resolveGeneratedImagePath(imageUrl);
    let imageBuffer;
    try {
      imageBuffer = await fs.readFile(imagePath);
    } catch (error) {
      throw new ApiError(
        404,
        "Source image not found. Please generate a try-on look first."
      );
    }

    const promptText =
      typeof prompt === "string" && prompt.trim().length
        ? prompt.trim()
        : DEFAULT_VIDEO_PROMPT;
    const videoModel =
      videoModelId ||
      process.env.GOOGLE_GENAI_VIDEO_MODEL_ID ||
      "veo-3.1-generate-preview";

    let operation;
    try {
      operation = await ai.models.generateVideos({
        model: videoModel,
        prompt: promptText,
        image: {
          imageBytes: imageBuffer.toString("base64"),
          mimeType: detectMimeType(imagePath),
        },
        config: {
          numberOfVideos: 1,
          resolution: "720p",
          aspectRatio: "9:16",
          personGeneration: "allow_adult",
        },
      });
    } catch (error) {
      throw new ApiError(
        502,
        error?.message ||
          "Failed to generate video from AI service. Please try again."
      );
    }

    let attempts = 0;
    while (!operation.done) {
      if (attempts >= VIDEO_POLL_MAX_ATTEMPTS) {
        throw new ApiError(
          504,
          "Video generation is taking too long. Please try again in a moment."
        );
      }
      await sleep(VIDEO_POLL_INTERVAL_MS);
      operation = await ai.operations.getVideosOperation({ operation });
      attempts += 1;
    }

    const generatedVideo = operation?.response?.generatedVideos?.[0];
    const video = generatedVideo?.video;
    if (!video) {
      throw new ApiError(
        502,
        "AI service did not return a video. Please try again."
      );
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const fileName = `virtual_tryon_${Date.now()}${VIDEO_FILE_EXTENSION}`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    try {
      if (video.videoBytes) {
        const buffer = Buffer.from(video.videoBytes, "base64");
        await fs.writeFile(filePath, buffer);
      } else {
        await ai.files.download({
          file: video,
          downloadPath: filePath,
        });
      }
    } catch (error) {
      throw new ApiError(
        500,
        "Failed to store generated video. Please try again."
      );
    }

    const videoUrl = `/public/virtual-tryon/${fileName}`;
    let historyRecord = null;
    if (Number(historyId)) {
      try {
        historyRecord = await historyService.updateHistoryVideo(
          historyId,
          videoUrl
        );
      } catch (error) {
        console.warn(
          "[VirtualTryOn] Failed to update history with video",
          error
        );
      }
    }

    const payload = {
      videoUrl,
      historyId: historyRecord?.history_id || Number(historyId) || null,
    };
    if (historyRecord) {
      payload.history = historyRecord;
    }

    return res.status(201).json(JSend.success(payload));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateVirtualTryOn,
  generateVirtualTryOnVideo,
};
