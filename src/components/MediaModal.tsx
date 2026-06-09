import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface MediaModalProps {
  open: boolean;
  url: string;
  onClose: () => void;
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);
}

export function isEmbedSnippet(url: string): boolean {
  const t = url.trim();
  return t.startsWith("<iframe") || t.startsWith("<embed");
}

function extractEmbedSrc(snippet: string): string | null {
  const match = snippet.match(/src=["']([^"']+)["']/);
  return match ? match[1] : null;
}

export default function MediaModal({ open, url, onClose }: MediaModalProps) {
  if (!open) return null;

  const isEmbed = isEmbedSnippet(url);
  const isImage = !isEmbed && isImageUrl(url);
  const embedSrc = isEmbed ? extractEmbedSrc(url) : null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-51 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-zinc-300 truncate pr-4">
            {isEmbed ? "Embed" : "Image"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {isEmbed && embedSrc ? (
          <iframe
            src={embedSrc}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : isEmbed ? (
          <div className="px-4 pb-5 text-xs text-zinc-400">Could not parse embed src.</div>
        ) : isImage ? (
          <img src={url} alt="" className="w-full max-h-[70vh] object-contain" />
        ) : null}
      </div>
    </>,
    document.body,
  );
}
