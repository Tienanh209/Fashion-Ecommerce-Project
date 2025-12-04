import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { SidebarTryon, SidebarHistory } from "../../components";
import {
  generateVirtualTryOn,
  generateVirtualTryOnVideo,
} from "../../services/virtualTryon";
import historyService from "../../services/history";
import { useAuth } from "../../contexts/AuthContext";
import { imgUrl } from "../../utils/image";

const toAbsoluteUrl = (value) => imgUrl(value);

async function fetchImageBlob(imagePath, label) {
  const response = await fetch(toAbsoluteUrl(imagePath));
  if (!response.ok) {
    throw new Error(`Unable to load ${label || "selected outfit image"}.`);
  }
  return response.blob();
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    image.src = objectUrl;
  });
}

async function createGarmentFile(imagePath) {
  const blob = await fetchImageBlob(imagePath, "selected outfit image");
  const type = blob.type || "image/png";
  const extension = type.split("/")[1] || "png";
  return new File([blob], `garment.${extension}`, { type });
}

async function mergeOutfitImages(topPath, bottomPath) {
  const [topBlob, bottomBlob] = await Promise.all([
    fetchImageBlob(topPath, "selected top image"),
    fetchImageBlob(bottomPath, "selected bottom image"),
  ]);

  const [topImage, bottomImage] = await Promise.all([
    loadImageFromBlob(topBlob),
    loadImageFromBlob(bottomBlob),
  ]);

  const width = Math.max(topImage.width, bottomImage.width);
  const topScale = width / topImage.width;
  const bottomScale = width / bottomImage.width;
  const topHeight = Math.round(topImage.height * topScale);
  const bottomHeight = Math.round(bottomImage.height * bottomScale);
  const height = topHeight + bottomHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(topImage, 0, 0, width, topHeight);
  ctx.drawImage(bottomImage, 0, topHeight, width, bottomHeight);

  const mergedBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to combine outfit images."));
    }, "image/png");
  });

  return new File([mergedBlob], "garment-combined.png", {
    type: mergedBlob.type || "image/png",
  });
}

function VirtualTryon() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const [generatedImage, setGeneratedImage] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [latestHistoryId, setLatestHistoryId] = useState(null);
  const [generatedImagePath, setGeneratedImagePath] = useState("");
  const [activeMedia, setActiveMedia] = useState("image");

  const userId = useMemo(() => user?.user_id ?? null, [user]);
  const preselectVariantId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get("variant");
    return value ? value.trim() : null;
  }, [location.search]);
  const canRequestVideo = useMemo(
    () => Boolean(latestHistoryId && generatedImagePath),
    [latestHistoryId, generatedImagePath]
  );
  const hasGeneratedImage = Boolean(generatedImage);
  const hasGeneratedVideo = Boolean(generatedVideo);
  const showVideo = activeMedia === "video" && hasGeneratedVideo;
  const showImage = !showVideo && hasGeneratedImage;

  const refreshHistory = useCallback(async () => {
    if (!ready || !userId) {
      setHistoryItems([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const data = await historyService.fetchHistory(userId, { limit: 30 });
      setHistoryItems(data?.history || []);
    } catch (err) {
      console.warn("[VirtualTryon] Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [ready, userId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const handleGenerate = useCallback(
    async ({
      modelFile,
      garmentImage,
      topImage,
      bottomImage,
      background,
      time,
    }) => {
      try {
        setGenerating(true);
        setError("");
        setNotes([]);
        setGeneratedImage("");
        setGeneratedVideo("");
        setVideoError("");
        setVideoGenerating(false);
        setLatestHistoryId(null);
        setGeneratedImagePath("");
        setActiveMedia("image");

        let garmentFile;
        if (topImage && bottomImage) {
          garmentFile = await mergeOutfitImages(topImage, bottomImage);
        } else if (garmentImage) {
          garmentFile = await createGarmentFile(garmentImage);
        } else {
          throw new Error("Please select clothing items to try on.");
        }

        const data = await generateVirtualTryOn({
          modelFile,
          garmentFile,
          background,
          time,
        });

        if (data?.imageUrl) {
          setGeneratedImage(imgUrl(data.imageUrl));
          setGeneratedImagePath(data.imageUrl);
          setActiveMedia("image");
        }

        if (Array.isArray(data?.notes) && data.notes.length) {
          setNotes(data.notes);
        } else {
          setNotes([]);
        }

        if (userId && data?.imageUrl) {
          try {
            const saved = await historyService.addHistory(userId, {
              imageUrl: data.imageUrl,
            });
            if (saved?.history) {
              setHistoryItems((prev) => [saved.history, ...(prev || [])]);
              setLatestHistoryId(saved.history.history_id || null);
            } else {
              refreshHistory();
              setLatestHistoryId(null);
            }
          } catch (err) {
            console.warn("[VirtualTryon] Failed to store history", err);
            setLatestHistoryId(null);
          }
        } else {
          setLatestHistoryId(null);
        }
      } catch (err) {
        setError(err?.message || "Failed to generate virtual try-on.");
      } finally {
        setGenerating(false);
      }
    },
    [refreshHistory, userId]
  );

  const handleGenerateVideo = useCallback(async () => {
    if (!generatedImagePath) {
      setVideoError("Please generate a virtual try-on look first.");
      return;
    }
    if (!latestHistoryId) {
      setVideoError(
        "Please wait for the generated image to be saved before creating a video."
      );
      return;
    }
    try {
      setVideoGenerating(true);
      setVideoError("");
      const data = await generateVirtualTryOnVideo({
        imageUrl: generatedImagePath,
        historyId: latestHistoryId,
      });
      if (data?.videoUrl) {
        setGeneratedVideo(imgUrl(data.videoUrl));
        setActiveMedia("video");
      }
      if (data?.history) {
        setHistoryItems((prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((entry) =>
            entry.history_id === data.history.history_id
              ? data.history
              : entry
          );
        });
        setLatestHistoryId(data.history.history_id);
      } else if (data?.historyId) {
        setLatestHistoryId(data.historyId);
      } else {
        refreshHistory();
      }
    } catch (err) {
      setVideoError(err?.message || "Failed to generate fashion video.");
    } finally {
      setVideoGenerating(false);
    }
  }, [generatedImagePath, latestHistoryId, refreshHistory]);

  const handleHistorySelect = useCallback((entry) => {
    if (!entry) return;
    const image = entry.image_url || entry.imageUrl;
    if (!image) return;
    setGeneratedImage(imgUrl(image));
    setNotes([]);
    setError("");
    setGeneratedImagePath(image);
    setLatestHistoryId(entry.history_id || entry.historyId || null);
    setVideoError("");
    if (entry.video_url || entry.videoUrl) {
      setGeneratedVideo(imgUrl(entry.video_url || entry.videoUrl));
      setActiveMedia("video");
    } else {
      setGeneratedVideo("");
      setActiveMedia("image");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <aside className="w-full xl:w-[400px] 2xl:w-[600px]">
        <SidebarTryon
          onGenerate={handleGenerate}
          generating={generating}
          submitError={error}
          preselectVariantId={preselectVariantId}
        />
      </aside>
      <section className="flex w-full flex-1 flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="rounded-full bg-neutral-900 px-6 py-3 text-center text-2xl font-semibold text-white md:text-3xl">
          Virtual Try-on Room
        </div>
        <div className="flex flex-1 items-center justify-center">
          {generating ? (
            <div className="text-sm text-neutral-500">
              Generating your virtual outfit…
            </div>
          ) : hasGeneratedImage || hasGeneratedVideo ? (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="w-full max-w-[550px] space-y-3">
                {hasGeneratedImage && hasGeneratedVideo ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMedia("image")}
                      className={[
                        "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                        activeMedia === "image"
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                      ].join(" ")}
                    >
                      View image
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMedia("video")}
                      className={[
                        "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                        activeMedia === "video"
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                      ].join(" ")}
                    >
                      View video
                    </button>
                  </div>
                ) : null}
                {showVideo ? (
                  <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-black shadow-md overflow-hidden">
                    <video
                      src={generatedVideo}
                      controls
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : showImage ? (
                  <img
                    src={generatedImage}
                    alt="Virtual try-on result"
                    className="w-full rounded-3xl object-cover shadow-md"
                  />
                ) : null}
              </div>
              {activeMedia !== "video" ? (
                <div className="w-full max-w-[624px] space-y-3 rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm">
                  <div>
                    <p className="text-base font-semibold text-neutral-900">
                      Runway video
                    </p>
                    <p className="text-sm text-neutral-500">
                      Transform this still image into a short, elegant motion
                      clip.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateVideo}
                    disabled={videoGenerating || !canRequestVideo || generating}
                    className={[
                      "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
                      videoGenerating || !canRequestVideo || generating
                        ? "cursor-not-allowed bg-neutral-300"
                        : "bg-neutral-900 hover:bg-neutral-800",
                    ].join(" ")}
                  >
                    {videoGenerating
                      ? "Generating couture video…"
                      : "Generate couture video"}
                  </button>
                  {!canRequestVideo ? (
                    <p className="text-xs text-neutral-500">
                      Save a look (and stay signed in) to unlock video previews.
                    </p>
                  ) : null}
                  {videoError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {videoError}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {notes.length ? (
                <div className="w-full rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-700">
                  <p className="mb-2 font-medium text-neutral-900">AI notes</p>
                  <ul className="space-y-2">
                    {notes.map((note, index) => (
                      <li key={index} className="leading-relaxed">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="text-center text-sm text-neutral-500">
              Select a model photo and outfit on the left to preview your virtual
              look.
            </div>
          )}
        </div>
      </section>
      <aside className="xl:w-64 xl:h-250">
        <SidebarHistory
          items={historyItems}
          loading={historyLoading}
          onFetch={refreshHistory}
          onSelect={handleHistorySelect}
        />
      </aside>
    </div>
  );
}

export default VirtualTryon;
