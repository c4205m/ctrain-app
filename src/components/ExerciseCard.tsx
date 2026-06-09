import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Video, Dumbbell, Pencil } from "lucide-react";
import Button from "./Button";
import type { Exercise } from "../db/db";
import Chip from "./Chip";
import MediaModal, { isImageUrl, isEmbedSnippet } from "./MediaModal";
import { formatDateDM } from "../utils/timeUtil";
import { MUSCLE_COLOR, DIFFICULTY_BADGE, slugToTitle } from "../utils/displayUtil";

interface ExerciseCardProps {
  exercise: Exercise;
  isExpanded?: boolean;
  snap?: string;
  hideChevron?: boolean;
  hideEdit?: boolean;
  hideLogs?: boolean;
  hideCollapsedChips?: boolean;
  onToggle: () => void;
  onLog?: () => void;
  onEdit?: () => void;
}

export default function ExerciseCard({
  exercise,
  isExpanded,
  snap = "snap-center",
  hideChevron = false,
  hideEdit = false,
  hideLogs = false,
  hideCollapsedChips = false,
  onToggle,
  onLog,
  onEdit,
}: ExerciseCardProps) {
  const badge = DIFFICULTY_BADGE[exercise.difficulty] ?? DIFFICULTY_BADGE.Beginner;
  const hasLogs = !!exercise.highestLog;
  const [videoOpen, setVideoOpen] = useState(false);
  const mediaLabel = exercise.url
    ? isEmbedSnippet(exercise.url) ? "Embed"
    : isImageUrl(exercise.url) ? "Image"
    : "Link"
    : null;

  return (
    <>
    <div className={`bg-white rounded-2xl border border-zinc-100 overflow-hidden shrink-0 w-full h-full ${snap}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-900 text-sm truncate">{exercise.name}</div>
          <p className={`text-[10px] mb-3 ${badge.cls}`}> {badge.label} </p>
          {!hideCollapsedChips && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
        {!hideChevron && (
          <ChevronDown
            size={18}
            className={`text-zinc-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-3">
          {hasLogs && !hideLogs ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Last session", log: exercise.latestLog },
                { label: "Personal best", log: exercise.highestLog },
              ].map(({ label, log }) => {
                const unit =
                  log?.setType === "rep" ? " reps" : log?.setType === "distance" ? " m" : " s";
                return (
                  <div key={label} className="bg-zinc-50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                      {label}
                    </div>
                    {log ? (
                      <>
                        <div className="font-heading font-bold text-zinc-900">
                          {log.sets}×{log.effortPerSet}
                          {unit}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {log.bodyweight ? "Bodyweight" : `${log.weight} kg`} · {formatDateDM(log.date)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-zinc-400">—</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !hideLogs ? (
            <div className="bg-zinc-50 rounded-xl px-4 py-3 text-center">
              <div className="text-sm font-semibold text-zinc-500">No logs yet</div>
              <div className="text-xs text-zinc-400 mt-0.5">Tap Log to record your first set</div>
            </div>
          ) : null}

          {(hideCollapsedChips ? exercise.muscles.length > 0 : exercise.muscles.length > 1) && (
            <div className="flex flex-wrap gap-1.5">
              {(hideCollapsedChips ? exercise.muscles : exercise.muscles.slice(1)).map((m) => (
                <Chip
                  key={m}
                  variant="custom"
                  customClass="text-white border-none"
                  style={{ backgroundColor: MUSCLE_COLOR[m] }}
                >
                  {slugToTitle(m)}
                </Chip>
              ))}
            </div>
          )}

          {(hideCollapsedChips ? exercise.tools.length > 0 : exercise.tools.length > 1) && (
            <div className="flex flex-wrap gap-1.5">
              {(hideCollapsedChips ? exercise.tools : exercise.tools.slice(1)).map((m) => (
                <Chip key={m} variant="secondary">
                  {m}
                </Chip>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {exercise.url && (
              <Button
                variant="ghost"
                aria-label="Video"
                onClick={() => {
                  const u = exercise.url!;
                  if (isEmbedSnippet(u) || isImageUrl(u)) setVideoOpen(true);
                  else window.open(u, "_blank");
                }}
                className="flex-1 text-xs py-2"
              >
                <Video size={14} /> {mediaLabel}
              </Button>
            )}
            <Button
              variant="secondary"
              aria-label="Log"
              onClick={onLog}
              className="flex-1 text-xs py-2"
            >
              <Dumbbell size={14} /> Log
            </Button>
            {!hideEdit && (
              <Button
                variant="ghost"
                aria-label="Edit"
                onClick={onEdit}
                className="flex-1 text-xs py-2"
              >
                <Pencil size={14} /> Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>

    <AnimatePresence>
      {videoOpen && exercise.url && (
        <MediaModal url={exercise.url} onClose={() => setVideoOpen(false)} />
      )}
    </AnimatePresence>
  </>
  );
}
