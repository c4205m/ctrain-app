import type { CSSProperties } from "react";
import type { Exercise } from "../db/db";
import Chip from "./Chip";
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

  return (
    <button 
      type="button"
      onClick={() => onTap?.(exercise)}
      className={`bg-white border border-zinc-100
        px-4 py-3 text-left rounded-2xl
        overflow-hidden shrink-0 ${snap} ${onTap && "cursor-pointer"} ${className}`}
      style={style}
    >
      <div className="font-semibold text-zinc-900 text-sm truncate">{exercise.name}</div>
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
    </button>
  );
}
