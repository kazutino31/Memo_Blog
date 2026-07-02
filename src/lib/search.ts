import Fuse from "fuse.js";
import type { NoteMeta } from "./loadNotes";

export function createSearchIndex(notes: NoteMeta[]) {
  return new Fuse(notes, {
    keys: [
      { name: "title", weight: 2 },
      { name: "description", weight: 1.2 },
      { name: "tags", weight: 1 },
      { name: "content", weight: 0.5 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });
}
