import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";
import type { MovementTypeEntry } from "../../../db/db";
import Input from "../../../components/Input";
import {
  type EditorDataset,
  addEquipment,
  removeEquipment,
  addMovementType,
  removeMovementType,
  setMovementTypeDescription,
} from "../editorData";
import { TabLayout, EmptyHint, RowCheckbox, BatchActions, SortableTh, thCls, tdCls } from "./shared";
import { useRowSelection } from "./useRowSelection";
import { useTableSort, sortRows } from "./useTableSort";

type TagSortKey = "name" | "used";

const CONFIG = {
  equipment: {
    title: "Equipment",
    usageField: "tools" as const,
    hasDescription: false,
    add: (ds: EditorDataset, name: string) => addEquipment(ds, name),
    remove: removeEquipment,
  },
  movementTypes: {
    title: "Moves",
    usageField: "movementType" as const,
    hasDescription: true,
    add: (ds: EditorDataset, name: string, description?: string) => addMovementType(ds, name, description),
    remove: removeMovementType,
  },
};

export default function TagListTab({
  kind,
  dataset,
  update,
}: {
  kind: keyof typeof CONFIG;
  dataset: EditorDataset;
  update: (fn: (ds: EditorDataset) => EditorDataset) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const { title, usageField, hasDescription, add, remove } = CONFIG[kind];
  const items = dataset[kind];

  const { sort, toggleSort } = useTableSort<TagSortKey>();

  const usage = new Map<string, number>();
  for (const ex of dataset.exercises)
    for (const t of ex[usageField]) usage.set(t, (usage.get(t) ?? 0) + 1);
  const usageCount = (itemName: string) => usage.get(itemName) ?? 0;

  const afterSearch = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  const filtered = sort
    ? sortRows(afterSearch, sort.dir, (i) =>
        sort.key === "name" ? i.name.toLowerCase() : usageCount(i.name)
      )
    : afterSearch;
  const sel = useRowSelection(
    filtered.map((i) => i.id!),
    items.map((i) => i.id!)
  );

  function handleBatchDelete() {
    const affected = sel.ids
      .map((id) => items.find((i) => i.id === id))
      .reduce((n, item) => n + (item ? usageCount(item.name) : 0), 0);
    const warning = affected > 0 ? ` Tag is removed from ${affected} exercise use(s).` : "";
    if (!window.confirm(`Delete ${sel.count} item${sel.count === 1 ? "" : "s"}?${warning}`)) return;
    update((ds) => sel.ids.reduce((acc, id) => remove(acc, id), ds));
    sel.clear();
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some((i) => i.name === trimmed)) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    update((ds) => add(ds, trimmed, description.trim() || undefined));
    setName("");
    setDescription("");
  }

  return (
    <TabLayout
      title={title}
      count={items.length}
      toolbar={
        <>
          <Input
            icon={<Search size={16} />}
            inputSize="sm"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-48"
          />
          <BatchActions count={sel.count} onDelete={handleBatchDelete} onClear={sel.clear} />
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
          <Input
            inputSize="sm"
            placeholder={`New ${title.toLowerCase().replace(/s$/, "")}…`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            wrapperClassName="w-48"
          />
          {hasDescription && (
            <Input
              inputSize="sm"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              wrapperClassName="w-64"
            />
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-40"
            disabled={!name.trim()}
          >
            Add
          </button>
        </form>
        </>
      }
      table={
        filtered.length === 0 ? (
          <EmptyHint>{search ? "Nothing matches." : "Nothing here yet."}</EmptyHint>
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
                {hasDescription && <th className={`${thCls} w-1/2`}>Description</th>}
                <SortableTh label="Used by" dir={sort?.key === "used" ? sort.dir : undefined} onClick={() => toggleSort("used")} />
                <th className={`${thCls} w-16`} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const used = usageCount(item.name);
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-zinc-50 ${
                      sel.has(item.id!) ? "bg-orange-50/60" : "hover:bg-zinc-50"
                    }`}
                  >
                    <td className={tdCls}>
                      <RowCheckbox
                        checked={sel.has(item.id!)}
                        onClick={(e) => sel.toggle(item.id!, e.shiftKey)}
                      />
                    </td>
                    <td className={`${tdCls} font-medium text-zinc-900`}>{item.name}</td>
                    {hasDescription && (
                      <td className={tdCls}>
                        <input
                          value={(item as MovementTypeEntry).description ?? ""}
                          placeholder="Add description…"
                          onChange={(e) =>
                            update((ds) => setMovementTypeDescription(ds, item.id!, e.target.value))
                          }
                          onBlur={(e) =>
                            update((ds) => setMovementTypeDescription(ds, item.id!, e.target.value.trim()))
                          }
                          className="w-full bg-transparent border border-transparent hover:border-zinc-200 rounded-lg px-2 py-1 text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </td>
                    )}
                    <td className={`${tdCls} text-zinc-500`}>
                      {used} exercise{used === 1 ? "" : "s"}
                    </td>
                    <td className={tdCls}>
                      <button
                        type="button"
                        onClick={() => update((ds) => remove(ds, item.id!))}
                        title={used > 0 ? `Removes tag from ${used} exercise(s)` : "Delete"}
                        className="text-zinc-300 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      }
      panel={null}
    />
  );
}
