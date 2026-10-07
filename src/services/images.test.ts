import { existsSync } from "node:fs";
import { it, expect } from "vitest";
import { EXERCISES } from "../data/exercises";

it("maps exercises to bundled images that exist", () => {
  const missing = EXERCISES.filter((e) => !e.image).map((e) => e.sourceName);
  expect(missing).toEqual(["High Pull"]);
  for (const e of EXERCISES) {
    if (!e.image) continue;
    expect(existsSync(`public/exercises/${e.image.dbId}_0.jpg`), e.sourceName).toBe(true);
    expect(existsSync(`public/exercises/${e.image.dbId}_1.jpg`), e.sourceName).toBe(true);
  }
});
