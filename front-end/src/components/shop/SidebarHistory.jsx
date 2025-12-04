import { useEffect, useMemo } from "react";
import { History as HistoryIcon } from "lucide-react";
import PropTypes from "prop-types";
import { imgUrl } from "../../utils/image";

function HistoryItem({ image, video, createdAt, onSelect }) {
  const formatted = useMemo(() => {
    if (!createdAt) return "";
    try {
      const date = new Date(createdAt);
      return date.toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.log(error);
      return "";
    }
  }, [createdAt]);

  const hasVideo = Boolean(video);
  const imageSrc = imgUrl(image);
  const videoSrc = hasVideo ? imgUrl(video) : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-2 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="relative w-full overflow-hidden rounded-xl pb-[120%]">
        {hasVideo ? (
          <video
            src={videoSrc}
            poster={imageSrc}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
          />
        ) : (
          <img
            src={imageSrc}
            alt="History record"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {hasVideo ? (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
            Video
          </span>
        ) : null}
      </div>
      {formatted ? (
        <span className="text-xs font-medium text-neutral-500">{formatted}</span>
      ) : null}
    </button>
  );
}

HistoryItem.propTypes = {
  image: PropTypes.string.isRequired,
  video: PropTypes.string,
  createdAt: PropTypes.string,
  onSelect: PropTypes.func,
};

function EmptyHistory() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/70 p-6 text-center text-sm text-neutral-500">
      Virtual try-on results will appear here once you generate them.
    </div>
  );
}

function SidebarHistory({ items, loading, onFetch, onSelect }) {
  useEffect(() => {
    onFetch?.();
  }, [onFetch]);

  return (
    <aside
      className="flex h-full w-full flex-col gap-4 rounded-3xl bg-neutral-100 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white">
            <HistoryIcon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-neutral-900">History</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Loading history…
          </div>
        ) : !items?.length ? (
          <EmptyHistory />
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((entry) => (
              <HistoryItem
                key={entry.history_id || entry.image_url}
                image={entry.image_url || entry.imageUrl}
                video={entry.video_url || entry.videoUrl}
                createdAt={entry.created_at || entry.createdAt}
                onSelect={() => onSelect?.(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

SidebarHistory.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onFetch: PropTypes.func,
  onSelect: PropTypes.func,
};

export default SidebarHistory;
