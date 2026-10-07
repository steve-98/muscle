import { it, expect } from "vitest";
import { EXERCISES } from "../data/exercises";
it("links Simply Fitness guides", () => {
  const missing = EXERCISES.filter((e) => !e.guide).map((e) => e.sourceName);
  expect(missing).toEqual([]);
});
