import { useState } from "react";

export type SortDir = "asc" | "desc";

export function useTableSort<K extends string>() {
  const [sort, setSort] = useState<{ key: K; dir: SortDir } | null>(null);

  function toggleSort(key: K) {
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null
    );
  }

  return { sort, toggleSort };
}

export function sortRows<T>(rows: T[], dir: SortDir, get: (row: T) => string | number): T[] {
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
    return dir === "asc" ? cmp : -cmp;
  });
}
