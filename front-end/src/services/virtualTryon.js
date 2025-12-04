import http from "./http";

export const generateVirtualTryOn = async ({
  modelFile,
  garmentFile,
  prompt,
  modelId,
  background,
  time,
}) => {
  const formData = new FormData();
  if (garmentFile) {
    formData.append("garmentImage", garmentFile);
  }
  if (modelFile) {
    formData.append("modelImage", modelFile);
  }
  if (prompt) {
    formData.append("prompt", prompt);
  }
  if (modelId) {
    formData.append("modelId", modelId);
  }
  if (background) {
    formData.append("background", background);
  }
  if (time) {
    formData.append("time", time);
  }

  const data = await http.postForm("/virtual-tryon", formData);
  return data;
};

export const generateVirtualTryOnVideo = async ({
  imageUrl,
  historyId,
  prompt,
  modelId,
} = {}) => {
  const payload = {};
  if (imageUrl) payload.imageUrl = imageUrl;
  if (historyId) payload.historyId = historyId;
  if (prompt) payload.prompt = prompt;
  if (modelId) payload.videoModelId = modelId;
  const data = await http.postJSON("/virtual-tryon/video", payload);
  return data;
};

export default {
  generateVirtualTryOn,
  generateVirtualTryOnVideo,
};
