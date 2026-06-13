import { useRef, useState } from "react";

export function useRowSelection(visibleIds: string[], allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchorRef = useRef<{ id: string; on: boolean } | null>(null);

  const ids = allIds.filter((id) => selected.has(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  function toggle(id: string, shiftKey = false) {
    const anchor = anchorRef.current;
    const next = new Set(selected);
    const a = anchor ? visibleIds.indexOf(anchor.id) : -1;
    const b = visibleIds.indexOf(id);
    let on: boolean;
    if (shiftKey && anchor && anchor.id !== id && a !== -1 && b !== -1) {
      // shift range takes the anchor's state: extend a selection or a deselection
      on = anchor.on;
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (on) next.add(visibleIds[i]);
        else next.delete(visibleIds[i]);
      }
    } else {
      on = !next.has(id);
      if (on) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
    anchorRef.current = { id, on };
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
    anchorRef.current = null;
  }

  function clear() {
    setSelected(new Set());
    anchorRef.current = null;
  }

  return {
    ids,
    count: ids.length,
    has: (id: string) => selected.has(id),
    toggle,
    toggleAllVisible,
    clear,
    allVisibleSelected,
    someVisibleSelected,
  };
}
