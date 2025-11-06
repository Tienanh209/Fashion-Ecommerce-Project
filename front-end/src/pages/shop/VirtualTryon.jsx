import { useCallback, useEffect, useMemo, useState } from "react";
import { SidebarTryon, SidebarHistory } from "../../components";
import { generateVirtualTryOn } from "../../services/virtualTryon";
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
  const [generatedImage, setGeneratedImage] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const userId = useMemo(() => user?.user_id ?? null, [user]);

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
            } else {
              refreshHistory();
            }
          } catch (err) {
            console.warn("[VirtualTryon] Failed to store history", err);
          }
        }
      } catch (err) {
        setError(err?.message || "Failed to generate virtual try-on.");
      } finally {
        setGenerating(false);
      }
    },
    [refreshHistory, userId]
  );

  const handleHistorySelect = useCallback((entry) => {
    if (!entry) return;
    const image = entry.image_url || entry.imageUrl;
    if (image) {
      setGeneratedImage(imgUrl(image));
      setNotes([]);
      setError("");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <aside className="w-full xl:w-[400px] 2xl:w-[600px]">
        <SidebarTryon
          onGenerate={handleGenerate}
          generating={generating}
          submitError={error}
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
          ) : generatedImage ? (
            <div className="flex w-full flex-col items-center gap-4">
              <img
                src={generatedImage}
                alt="Virtual try-on result"
                className="w-full max-w-[624px] rounded-3xl object-cover shadow-md"
              />
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
      <aside className="w-full xl:w-64">
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
