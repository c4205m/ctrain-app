import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { TabLayout, EmptyHint, thCls, tdCls } from "./shared";

const CONFIG = {
  equipment: {
    title: "Equipment",
    usageField: "tools" as const,
    hasDescription: false,
    add: (ds: EditorDataset, name: string) => addEquipment(ds, name),
    remove: removeEquipment,
  },
  movementTypes: {
    title: "Movement types",
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
  const { title, usageField, hasDescription, add, remove } = CONFIG[kind];
  const items = dataset[kind];

  const usageCount = (itemName: string) =>
    dataset.exercises.filter((ex) => ex[usageField].includes(itemName)).length;

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || items.some((i) => i.name === trimmed)) return;
    update((ds) => add(ds, trimmed, description.trim() || undefined));
    setName("");
    setDescription("");
  }

  return (
    <TabLayout
      title={title}
      count={items.length}
      toolbar={
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
      }
      table={
        items.length === 0 ? (
          <EmptyHint>Nothing here yet.</EmptyHint>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                {hasDescription && <th className={`${thCls} w-1/2`}>Description</th>}
                <th className={thCls}>Used by</th>
                <th className={`${thCls} w-16`} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const used = usageCount(item.name);
                return (
                  <tr key={item.id} className="border-t border-zinc-50 hover:bg-zinc-50">
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
