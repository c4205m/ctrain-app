import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

function MediaSkeleton() {
  return (
    <motion.div
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute inset-0 bg-zinc-800 overflow-hidden"
    >
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ willChange: "transform" }}
        className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent"
      />
    </motion.div>
  );
}

// Own component so `loaded` resets naturally when the modal unmounts or url changes (key)
function EmbedMedia({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      <iframe
        src={src}
        onLoad={() => setLoaded(true)}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
      <AnimatePresence>{!loaded && <MediaSkeleton />}</AnimatePresence>
    </div>
  );
}

function ImageMedia({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative ${loaded ? "" : "aspect-video"}`}>
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        className="w-full max-h-[70vh] object-contain"
      />
      <AnimatePresence>{!loaded && <MediaSkeleton />}</AnimatePresence>
    </div>
  );
}

export default function MediaModal({ open, url, onClose }: MediaModalProps) {
  const isEmbed = isEmbedSnippet(url);
  const isImage = !isEmbed && isImageUrl(url);
  const embedSrc = isEmbed ? extractEmbedSrc(url) : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}
      {open && (
        <motion.div
          key="card"
          className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-51 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          onClick={(e) => e.stopPropagation()}
        >
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
            <EmbedMedia key={embedSrc} src={embedSrc} />
          ) : isEmbed ? (
            <div className="px-4 pb-5 text-xs text-zinc-400">Could not parse embed src.</div>
          ) : isImage ? (
            <ImageMedia key={url} url={url} />
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
