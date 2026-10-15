import { useSyncExternalStore } from "react";

// Shaped like the planned /groups and /groups/{id}/children API (task 11, PLAN.md).
// ponytail: stored in this browser's localStorage until the backend exists, so data
// is per-device and unshared; swap these functions for api() calls (see TASKS.md).
export type Child = { id: string; name: string; birth_year: number | null };
export type Group = {
  id: string;
  name: string;
  kind: "class" | "family";
  academic_year: string | null;
  children: Child[];
};

const KEY = "bumilogi:groups";
const listeners = new Set<() => void>();
let cache: Group[] | null = null;

function read(): Group[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}

function write(next: Group[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode or quota: keep working in memory
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// null while server rendering (no localStorage there).
export function useGroups(): Group[] | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

const mapGroup = (id: string, fn: (g: Group) => Group) => write(read().map((g) => (g.id === id ? fn(g) : g)));

export const groups = {
  create: (g: Omit<Group, "id" | "children">) => {
    const id = crypto.randomUUID();
    write([...read(), { ...g, id, children: [] }]);
    return id;
  },
  update: (id: string, patch: Partial<Omit<Group, "id" | "children">>) => mapGroup(id, (g) => ({ ...g, ...patch })),
  remove: (id: string) => write(read().filter((g) => g.id !== id)),
  addChild: (groupId: string, c: Omit<Child, "id">) =>
    mapGroup(groupId, (g) => ({ ...g, children: [...g.children, { ...c, id: crypto.randomUUID() }] })),
  updateChild: (groupId: string, childId: string, patch: Partial<Omit<Child, "id">>) =>
    mapGroup(groupId, (g) => ({ ...g, children: g.children.map((c) => (c.id === childId ? { ...c, ...patch } : c)) })),
  removeChild: (groupId: string, childId: string) =>
    mapGroup(groupId, (g) => ({ ...g, children: g.children.filter((c) => c.id !== childId) })),
};
