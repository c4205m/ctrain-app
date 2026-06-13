import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X, Plus, Search } from "lucide-react";
import type { Plan } from "../../../db/db";
import Input from "../../../components/Input";
import { type EditorDataset, upsertPlan, removePlan } from "../editorData";
import { TabLayout, EmptyHint, RowCheckbox, BatchActions, SortableTh, DraftNumberInput, thCls, tdCls } from "./shared";
import { useRowSelection } from "./useRowSelection";
import { useTableSort, sortRows } from "./useTableSort";

type PlanSortKey = "name" | "description" | "count" | "duration";

const SORT_GET: Record<PlanSortKey, (p: Plan) => string | number> = {
  name: (p) => p.name.toLowerCase(),
  description: (p) => p.description.toLowerCase(),
  count: (p) => p.exercises.length,
  duration: (p) => p.duration,
};

export default function PlansTab({
  dataset,
  update,
}: {
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { sort, toggleSort } = useTableSort<PlanSortKey>();

  const afterSearch = dataset.plans.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );
  const filtered = sort ? sortRows(afterSearch, sort.dir, SORT_GET[sort.key]) : afterSearch;
  const selected = dataset.plans.find((p) => p.id === selectedId) ?? null;
  const sel = useRowSelection(
    filtered.map((p) => p.id!),
    dataset.plans.map((p) => p.id!)
  );
  const exerciseName = (id: string) =>
    dataset.exercises.find((ex) => ex.id === id)?.name ?? "(deleted)";

  function handleBatchDelete() {
    if (!window.confirm(`Delete ${sel.count} plan${sel.count === 1 ? "" : "s"}?`)) return;
    update((ds) => sel.ids.reduce((acc, id) => removePlan(acc, id), ds));
    sel.clear();
  }

  function handleAdd() {
    const plan: Plan = {
      id: crypto.randomUUID(),
      name: "New plan",
      description: "",
      createdAt: new Date().toISOString(),
      exercises: [],
      duration: 0,
    };
    update((ds) => upsertPlan(ds, plan));
    setSelectedId(plan.id!);
  }

  function patch(changes: Partial<Plan>) {
    if (!selected) return;
    update((ds) => upsertPlan(ds, { ...selected, ...changes }));
  }

  const unusedExercises = selected
    ? dataset.exercises.filter((ex) => !selected.exercises.some((e) => e.exerciseId === ex.id))
    : [];

  return (
    <TabLayout
      title="Plans"
      count={dataset.plans.length}
      onAdd={handleAdd}
      addLabel="Add plan"
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
          <BatchActions count={sel.count} onDelete={handleBatchDelete} onClear={sel.clear} />
        </>
      }
      table={
        filtered.length === 0 ? (
          <EmptyHint>{search ? "No plans match." : "No plans yet."}</EmptyHint>
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
                <SortableTh label="Description" dir={sort?.key === "description" ? sort.dir : undefined} onClick={() => toggleSort("description")} />
                <SortableTh label="Exercises" dir={sort?.key === "count" ? sort.dir : undefined} onClick={() => toggleSort("count")} />
                <SortableTh label="Duration" dir={sort?.key === "duration" ? sort.dir : undefined} onClick={() => toggleSort("duration")} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={(e) =>
                    sel.count > 0 ? sel.toggle(p.id!, e.shiftKey) : setSelectedId(p.id!)
                  }
                  className={`border-t border-zinc-50 cursor-pointer ${
                    sel.has(p.id!) || selectedId === p.id ? "bg-orange-50/60" : "hover:bg-zinc-50"
                  }`}
                >
                  <td className={tdCls}>
                    <RowCheckbox
                      checked={sel.has(p.id!)}
                      onClick={(e) => {
                        e.stopPropagation();
                        sel.toggle(p.id!, e.shiftKey);
                      }}
                    />
                  </td>
                  <td className={`${tdCls} font-medium text-zinc-900`}>{p.name}</td>
                  <td className={`${tdCls} text-zinc-500`}>{p.description}</td>
                  <td className={tdCls}>{p.exercises.length}</td>
                  <td className={`${tdCls} text-zinc-500`}>~{p.duration} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      panel={
        selected && (
          <div className="p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg text-zinc-900">Edit plan</h2>
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
            <Input
              label="Description"
              value={selected.description}
              onChange={(e) => patch({ description: e.target.value })}
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Exercises · ~{selected.duration} min
              </span>

              {selected.exercises.map((e, i) => (
                <div
                  key={e.exerciseId}
                  className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2"
                >
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-zinc-800">
                    {exerciseName(e.exerciseId)}
                  </span>
                  <NumberField
                    value={e.sets}
                    label="sets"
                    onChange={(sets) =>
                      patch({
                        exercises: selected.exercises.map((x, j) => (j === i ? { ...x, sets } : x)),
                      })
                    }
                  />
                  <NumberField
                    value={e.reps}
                    label="reps"
                    onChange={(reps) =>
                      patch({
                        exercises: selected.exercises.map((x, j) => (j === i ? { ...x, reps } : x)),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({ exercises: selected.exercises.filter((_, j) => j !== i) })
                    }
                    className="text-zinc-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {unusedExercises.length > 0 && (
                <div className="relative">
                  <Plus
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      patch({
                        exercises: [
                          ...selected.exercises,
                          { exerciseId: e.target.value, sets: 3, reps: 10 },
                        ],
                      });
                    }}
                    className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-zinc-600 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                  >
                    <option value="">Add exercise…</option>
                    {unusedExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              onClick={() => {
                update((ds) => removePlan(ds, selected.id!));
                setSelectedId(null);
              }}
              whileTap={{ scale: 0.97 }}
              style={{ willChange: "transform" }}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
            >
              <Trash2 size={16} />
              Delete plan
            </motion.button>
          </div>
        )
      }
    />
  );
}

function NumberField({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <DraftNumberInput
        min={1}
        value={value}
        onCommit={onChange}
        className="w-12 bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-sm text-zinc-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
    </label>
  );
}
