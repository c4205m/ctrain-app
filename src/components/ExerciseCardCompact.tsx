import { useState, type CSSProperties } from "react";
import { PlayCircle, ExternalLink } from "lucide-react";
import type { Exercise } from "../db/db";
import Chip from "./Chip";
import MediaModal, { isImageUrl, isEmbedSnippet } from "./MediaModal";
import { MUSCLE_COLOR, DIFFICULTY_BADGE, slugToTitle } from "../utils/displayUtil";

interface ExerciseCardCompactProps {
  exercise: Exercise;
  snap?: "snap-start" | "snap-center" | "snap-end";
  hideCollapsedChips?: boolean;
  showNeglect?: boolean;
  className?: string;
  style?: CSSProperties;
  onTap?: (ex: Exercise) => void;
}

export default function ExerciseCardCompact({
  exercise,
  snap = "snap-center",
  hideCollapsedChips = false,
  showNeglect = false,
  className = "",
  style,
  onTap,
}: ExerciseCardCompactProps) {
  const badge = DIFFICULTY_BADGE[exercise.difficulty] ?? DIFFICULTY_BADGE.Beginner;
  const [videoOpen, setVideoOpen] = useState(false);
  const isInApp = !!exercise.url && (isEmbedSnippet(exercise.url) || isImageUrl(exercise.url));

  return (
    <>
      <div
        role="button"
        aria-label={exercise.name}
        tabIndex={0}
        onClick={() => onTap?.(exercise)}
        onKeyDown={(e) => e.key === "Enter" && onTap?.(exercise)}
        className={`relative bg-white border border-zinc-100
          px-4 py-3 text-left rounded-2xl
          overflow-hidden shrink-0 ${snap} ${onTap ? "cursor-pointer" : ""} ${className}`}
        style={style}
      >
        {exercise.url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const u = exercise.url!;
              if (isEmbedSnippet(u) || isImageUrl(u)) setVideoOpen(true);
              else window.open(u, "_blank");
            }}
            className="absolute top-2.5 right-2.5 text-zinc-300 hover:text-orange-400 transition-colors"
            aria-label="Open media"
          >
            {isInApp ? <PlayCircle size={18} /> : <ExternalLink size={16} />}
          </button>
        )}
        <div className="font-semibold text-zinc-900 text-sm truncate pr-6">{exercise.name}</div>
        <p className={`text-[10px] ${badge.cls}`}>{badge.label}</p>
        {showNeglect && (
          <p className="text-[10px] text-zinc-400 mb-2">
            {exercise.latestLog?.date
              ? `${Math.floor((Date.now() - new Date(exercise.latestLog.date).getTime()) / 86_400_000)}d ago`
              : "Never logged"}
          </p>
        )}
        {!showNeglect && <div className="mb-3" />}
        {!hideCollapsedChips && (
          <div className="flex flex-col items-start gap-1.5 mt-1">
            <Chip
              variant="custom"
              customClass="text-white border-none"
              style={{ backgroundColor: MUSCLE_COLOR[exercise.muscles[0]] }}
            >
              {slugToTitle(exercise.muscles[0])}
            </Chip>
            <Chip variant="secondary">{exercise.tools[0] ?? "None"}</Chip>
          </div>
        )}
      </div>

      {exercise.url && (
        <MediaModal open={videoOpen} url={exercise.url} onClose={() => setVideoOpen(false)} />
      )}
    </>
  );
}
