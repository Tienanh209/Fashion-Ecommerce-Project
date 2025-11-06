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

export default {
  generateVirtualTryOn,
};
