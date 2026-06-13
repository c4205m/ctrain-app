import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListFilter, Search, Trash2, X } from "lucide-react";
import type { Exercise } from "../../../db/db";
import { DifficultyLevels, MuscleGroups, type DifficultyLevel, type MuscleGroup } from "../../../db/types";
import { slugToTitle, MUSCLE_COLOR, DIFFICULTY_BADGE } from "../../../utils/displayUtil";
import { filterExercises, MUSCLE_ORDER } from "../../../utils/filterUtil";
import Input from "../../../components/Input";
import Chip from "../../../components/Chip";
import FilterChipGroup from "../../../components/FilterChipGroup";
import SegmentedControl from "../../../components/SegmentedControl";
import MusclePicker from "../../../components/MusclePicker";
import { type EditorDataset, upsertExercise, removeExercise, toggleItem } from "../editorData";
import { TabLayout, EmptyHint, RowCheckbox, BatchActions, SortableTh, thCls, tdCls } from "./shared";
import { useRowSelection } from "./useRowSelection";
import { useTableSort, sortRows } from "./useTableSort";

const DIFFICULTIES = Object.values(DifficultyLevels);
const ALL_MUSCLES = Object.values(MuscleGroups).map((m) => m.slug);

type ExSortKey = "name" | "difficulty" | "muscles" | "tools" | "movement";

const SORT_GET: Record<ExSortKey, (ex: Exercise) => string | number> = {
  name: (ex) => ex.name.toLowerCase(),
  difficulty: (ex) => DIFFICULTIES.indexOf(ex.difficulty),
  muscles: (ex) => {
    const i = ex.muscles[0] != null ? MUSCLE_ORDER.indexOf(ex.muscles[0]) : -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  },
  tools: (ex) => ex.tools.join(", ").toLowerCase(),
  movement: (ex) => ex.movementType.join(", ").toLowerCase(),
};

export default function ExercisesTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fMuscles, setFMuscles] = useState<MuscleGroup[]>([]);
  const [fDifficulty, setFDifficulty] = useState<DifficultyLevel[]>([]);
  const [fTools, setFTools] = useState<string[]>([]);
  const [fMoves, setFMoves] = useState<string[]>([]);
  const { sort, toggleSort } = useTableSort<ExSortKey>();

  const activeFilterCount = fMuscles.length + fDifficulty.length + fTools.length + fMoves.length;

  function clearFilters() {
    setFMuscles([]);
    setFDifficulty([]);
    setFTools([]);
    setFMoves([]);
  }

  const afterFilters = filterExercises(
    dataset.exercises.filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase())),
    {
      muscles: fMuscles,
      difficulty: fDifficulty,
      movementTypes: fMoves,
      tools: fTools,
      filterMode: "intersection",
    }
  );
  const filtered = sort ? sortRows(afterFilters, sort.dir, SORT_GET[sort.key]) : afterFilters;
  const selected = dataset.exercises.find((ex) => ex.id === selectedId) ?? null;
  const sel = useRowSelection(
    filtered.map((ex) => ex.id!),
    dataset.exercises.map((ex) => ex.id!)
  );

  function handleBatchDelete() {
    if (!window.confirm(`Delete ${sel.count} exercise${sel.count === 1 ? "" : "s"}?`)) return;
    update((ds) => sel.ids.reduce((acc, id) => removeExercise(acc, id), ds));
    sel.clear();
  }

  function handleAdd() {
    const ex: Exercise = {
      id: crypto.randomUUID(),
      name: "New exercise",
      muscles: [],
      difficulty: "Beginner",
      tools: [],
      movementType: [],
    };
    update((ds) => upsertExercise(ds, ex));
    setSelectedId(ex.id!);
  }

  function patch(changes: Partial<Exercise>) {
    if (!selected) return;
    update((ds) => upsertExercise(ds, { ...selected, ...changes }));
  }

  return (
    <TabLayout
      title="Exercises"
      count={dataset.exercises.length}
      onAdd={handleAdd}
      addLabel="Add exercise"
      toolbar={
        <>
          <Input
            icon={<Search size={16} />}
            inputSize="sm"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-64"
          />
          <motion.button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            whileTap={{ scale: 0.96 }}
            style={{ willChange: "transform" }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer border ${
              filtersOpen || activeFilterCount > 0
                ? "border-orange-200 bg-orange-50 text-orange-600"
                : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <ListFilter size={15} />
            Filters
            {activeFilterCount > 0 && ` · ${activeFilterCount}`}
          </motion.button>
          <BatchActions count={sel.count} onDelete={handleBatchDelete} onClear={sel.clear} />
        </>
      }
      filters={
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex items-start gap-8">
                <div className="flex flex-col gap-1.5 shrink-0">
                  <FilterLabel>Muscles</FilterLabel>
                  <MusclePicker muscles={fMuscles} onChange={setFMuscles} modelWidth={130} />
                </div>
                <div className="flex flex-col gap-1.5 w-40 shrink-0">
                  <FilterLabel>Difficulty</FilterLabel>
                  <FilterChipGroup
                    values={DIFFICULTIES}
                    selected={fDifficulty}
                    onToggle={(d) => setFDifficulty(toggleItem(fDifficulty, d))}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <FilterLabel>Tools</FilterLabel>
                  <FilterChipGroup
                    values={dataset.equipment.map((e) => e.name)}
                    selected={fTools}
                    onToggle={(t) => setFTools(toggleItem(fTools, t))}
                    searchable
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <FilterLabel>Move</FilterLabel>
                  <FilterChipGroup
                    values={dataset.movementTypes.map((m) => m.name)}
                    selected={fMoves}
                    onToggle={(m) => setFMoves(toggleItem(fMoves, m))}
                    searchable
                  />
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 text-xs text-zinc-400 font-medium underline underline-offset-2 hover:text-zinc-600 cursor-pointer mt-0.5"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      }
      table={
        filtered.length === 0 ? (
          <EmptyHint>
            {search || activeFilterCount > 0 ? "No exercises match." : "No exercises yet."}
          </EmptyHint>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={`${thCls} w-10`}>
                  <RowCheckbox
                    checked={sel.allVisibleSelected}
                    indeterminate={sel.someVisibleSelected}
                    onClick={sel.toggleAllVisible}
                  />
                </th>
                <SortableTh label="Name" dir={sort?.key === "name" ? sort.dir : undefined} onClick={() => toggleSort("name")} />
                <SortableTh label="Difficulty" dir={sort?.key === "difficulty" ? sort.dir : undefined} onClick={() => toggleSort("difficulty")} />
                <SortableTh label="Muscles" dir={sort?.key === "muscles" ? sort.dir : undefined} onClick={() => toggleSort("muscles")} />
                <SortableTh label="Tools" dir={sort?.key === "tools" ? sort.dir : undefined} onClick={() => toggleSort("tools")} />
                <SortableTh label="Movement" dir={sort?.key === "movement" ? sort.dir : undefined} onClick={() => toggleSort("movement")} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => (
                <tr
                  key={ex.id}
                  onClick={(e) =>
                    sel.count > 0 ? sel.toggle(ex.id!, e.shiftKey) : setSelectedId(ex.id!)
                  }
                  className={`border-t border-zinc-50 cursor-pointer ${
                    sel.has(ex.id!) || selectedId === ex.id ? "bg-orange-50/60" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className={tdCls}>
                    <RowCheckbox
                      checked={sel.has(ex.id!)}
                      onClick={(e) => {
                        e.stopPropagation();
                        sel.toggle(ex.id!, e.shiftKey);
                      }}
                    />
                  </td>
                  <td className={`${tdCls} font-medium text-zinc-900`}>{ex.name}</td>
                  <td className={tdCls}>
                    <Chip variant="custom" size="sm" customClass={DIFFICULTY_BADGE[ex.difficulty]?.cls ?? ""}>
                      {DIFFICULTY_BADGE[ex.difficulty]?.label ?? ex.difficulty}
                    </Chip>
                  </td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1">
                      {ex.muscles.map((m) => (
                        <Chip
                          key={m}
                          variant="custom"
                          size="sm"
                          customClass="text-white border-none"
                          style={{ backgroundColor: MUSCLE_COLOR[m] }}
                        >
                          {slugToTitle(m)}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td className={`${tdCls} text-zinc-500`}>{ex.tools.join(", ")}</td>
                  <td className={`${tdCls} text-zinc-500`}>{ex.movementType.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      panel={
        sel.count > 0 ? (
          <BatchPanel
            dataset={dataset}
            ids={sel.ids}
            update={update}
            onDelete={handleBatchDelete}
            onClear={sel.clear}
          />
        ) : (
        selected && (
          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg text-zinc-900">Edit exercise</h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <Input
              label="Name"
              value={selected.name}
              onChange={(e) => patch({ name: e.target.value })}
            />

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Difficulty
              </span>
              <SegmentedControl
                options={DIFFICULTIES}
                selected={selected.difficulty}
                onChange={(difficulty) => patch({ difficulty })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Muscles
              </span>
              <MusclePicker
                muscles={selected.muscles}
                onChange={(muscles) => patch({ muscles })}
                modelWidth={160}
              />
            </div>

            <TagToggleGroup
              label="Tools"
              all={dataset.equipment.map((e) => e.name)}
              active={selected.tools}
              onToggle={(name) => patch({ tools: toggleItem(selected.tools, name) })}
            />

            <TagToggleGroup
              label="Move"
              all={dataset.movementTypes.map((m) => m.name)}
              active={selected.movementType}
              onToggle={(name) => patch({ movementType: toggleItem(selected.movementType, name) })}
            />

            <Input
              label="URL"
              hint="(optional)"
              value={selected.url ?? ""}
              onChange={(e) => patch({ url: e.target.value || undefined })}
            />

            {(selected.latestLog || selected.highestLog) && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Logs
                </span>
                <span className="text-sm text-zinc-500">
                  {selected.latestLog && <>Latest: {selected.latestLog.date.slice(0, 10)}. </>}
                  {selected.highestLog && <>Best: {selected.highestLog.date.slice(0, 10)}.</>}
                </span>
                <button
                  type="button"
                  onClick={() => patch({ latestLog: undefined, highestLog: undefined })}
                  className="self-start text-sm text-zinc-500 font-medium underline underline-offset-2 cursor-pointer hover:text-zinc-700"
                >
                  Clear logs
                </button>
              </div>
            )}

            <motion.button
              type="button"
              onClick={() => {
                update((ds) => removeExercise(ds, selected.id!));
                setSelectedId(null);
              }}
              whileTap={{ scale: 0.97 }}
              style={{ willChange: "transform" }}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
            >
              <Trash2 size={16} />
              Delete exercise
            </motion.button>
          </div>
        )
        )
      }
    />
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{children}</span>
  );
}

type TagField = "tools" | "movementType" | "muscles";

function BatchPanel({
  dataset,
  ids,
  update,
  onDelete,
  onClear,
}: {
  dataset: EditorDataset;
  ids: string[];
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const idSet = new Set(ids);
  const exercises = dataset.exercises.filter((ex) => idSet.has(ex.id!));
  const uniformDifficulty =
    exercises.length > 0 && exercises.every((ex) => ex.difficulty === exercises[0].difficulty)
      ? exercises[0].difficulty
      : undefined;

  function patchAll(fn: (ex: Exercise) => Exercise) {
    update((ds) =>
      ids.reduce((acc, id) => {
        const ex = acc.exercises.find((e) => e.id === id);
        return ex ? upsertExercise(acc, fn(ex)) : acc;
      }, ds)
    );
  }

  function countWith(field: TagField, name: string) {
    return exercises.filter((ex) => (ex[field] as string[]).includes(name)).length;
  }

  function toggleTag(field: TagField, name: string) {
    const onAll = countWith(field, name) === exercises.length;
    patchAll((ex) => {
      const arr = ex[field] as string[];
      const next = onAll ? arr.filter((t) => t !== name) : arr.includes(name) ? arr : [...arr, name];
      return { ...ex, [field]: next };
    });
  }

  return (
    <div className="p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg text-zinc-900">
          Edit {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <span className="text-sm text-zinc-400 font-medium -mt-3">
        Changes apply to every selected exercise. Faded chips are on some of them.
      </span>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Difficulty
        </span>
        <SegmentedControl
          options={DIFFICULTIES}
          selected={uniformDifficulty}
          onChange={(difficulty) => patchAll((ex) => ({ ...ex, difficulty }))}
        />
      </div>

      <TriChipGroup
        label="Muscles"
        names={ALL_MUSCLES}
        countWith={(name) => countWith("muscles", name)}
        total={exercises.length}
        onToggle={(name) => toggleTag("muscles", name as MuscleGroup)}
        chipFor={(name, state) => (
          <Chip
            variant="custom"
            customClass={state === "none" ? "bg-zinc-50 text-zinc-600 border-zinc-100" : "text-white border-none"}
            style={state === "none" ? undefined : { backgroundColor: MUSCLE_COLOR[name] }}
          >
            {slugToTitle(name)}
          </Chip>
        )}
      />

      <TriChipGroup
        label="Tools"
        names={dataset.equipment.map((e) => e.name)}
        countWith={(name) => countWith("tools", name)}
        total={exercises.length}
        onToggle={(name) => toggleTag("tools", name)}
      />

      <TriChipGroup
        label="Move"
        names={dataset.movementTypes.map((m) => m.name)}
        countWith={(name) => countWith("movementType", name)}
        total={exercises.length}
        onToggle={(name) => toggleTag("movementType", name)}
      />

      <motion.button
        type="button"
        onClick={onDelete}
        whileTap={{ scale: 0.97 }}
        style={{ willChange: "transform" }}
        className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
      >
        <Trash2 size={16} />
        Delete {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
      </motion.button>
    </div>
  );
}

type TriState = "all" | "some" | "none";

function TriChipGroup({
  label,
  names,
  countWith,
  total,
  onToggle,
  chipFor,
}: {
  label: string;
  names: string[];
  countWith: (name: string) => number;
  total: number;
  onToggle: (name: string) => void;
  chipFor?: (name: string, state: TriState) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {names.length === 0 && <span className="text-sm text-zinc-400">None defined.</span>}
        {names.map((name) => {
          const count = countWith(name);
          const state: TriState = count === 0 ? "none" : count === total ? "all" : "some";
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              title={state === "some" ? `On ${count} of ${total} — click to add to all` : undefined}
              className={`cursor-pointer ${state === "some" ? "opacity-50" : ""}`}
            >
              {chipFor ? (
                chipFor(name, state)
              ) : (
                <Chip variant={state === "none" ? "secondary" : "primary"}>{name}</Chip>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagToggleGroup({
  label,
  all,
  active,
  onToggle,
}: {
  label: string;
  all: string[];
  active: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {all.length === 0 && <span className="text-sm text-zinc-400">None defined.</span>}
        {all.map((name) => (
          <button key={name} type="button" onClick={() => onToggle(name)} className="cursor-pointer">
            <Chip variant={active.includes(name) ? "primary" : "secondary"}>{name}</Chip>
          </button>
        ))}
      </div>
    </div>
  );
}
