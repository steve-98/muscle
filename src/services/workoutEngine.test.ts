import { beforeEach, describe, expect, it } from "vitest";
import { getWorkout, PROGRAM } from "../data/program";
import { createInitialState, exportData, importData, loadState, saveState, STORAGE_KEY } from "./storage";
import { completeWorkout, countCompletedSets, getPreviousPerformance, startWorkout, updateSet } from "./workoutEngine";

describe("source program fidelity", () => {
  it("contains 12 weeks and five training days per week", () => {
    expect(PROGRAM.weeks).toHaveLength(12);
    expect(PROGRAM.weeks.every((week) => week.days.length === 5)).toBe(true);
    expect(getWorkout(1, 1)!.exercises[0].sets.map((set) => set.setNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("matches Week 1 Day 1 prescriptions and rest", () => {
    const workout = getWorkout(1, 1)!;
    expect(workout.exercises.map((item) => item.sourceName)).toEqual(["Squats", "Bench Press"]);
    expect(workout.exercises[0].sets.map((set) => [set.targetReps, set.restSeconds])).toEqual([
      [15, 60], [12, 90], [12, 90], [10, 120], [7, 180], [7, 180], [7, 180], [7, 180], [7, 180]
    ]);
  });

  it("matches Week 5 Day 2 source names and 4 by 10 prescriptions", () => {
    const workout = getWorkout(5, 2)!;
    expect(workout.exercises.map((item) => item.sourceName)).toContain("Seated Dumbell Curls");
    expect(workout.exercises.map((item) => item.sourceName)).toContain("Lying Tricep Extension (dumbbell)");
    expect(workout.exercises.every((item) => item.sets.length === 4 && item.sets.every((set) => set.targetReps === 10 && set.restSeconds === 90))).toBe(true);
  });

  it("matches the Week 9 major lift and deadlift schemes", () => {
    const workout = getWorkout(9, 1)!;
    expect(workout.exercises[0].sets.map((set) => set.targetReps)).toEqual([12, 8, 8, 6, 3, 3, 3, 3, 3]);
    const deadlift = getWorkout(9, 3)!.exercises[2];
    expect(deadlift.sets.map((set) => [set.targetReps, set.restSeconds])).toEqual([
      [8, 90], [8, 90], [6, 90], [6, 90], [3, 180], [3, 180], [3, 180], [3, 180], [3, 180]
    ]);
  });

  it("matches the Week 12 Day 2 4 by 12 variation", () => {
    const workout = getWorkout(12, 2)!;
    expect(workout.exercises).toHaveLength(8);
    expect(workout.exercises.every((item) => item.sets.length === 4 && item.sets.every((set) => set.targetReps === 12 && set.restSeconds === 90))).toBe(true);
  });
});

describe("workout logging and local persistence", () => {
  beforeEach(() => localStorage.clear());

  it("persists state and keeps targets separate from actual reps", () => {
    let state = startWorkout(createInitialState(), 1, 1, new Date("2026-10-08T00:00:00Z"));
    const session = state.workoutSessions[0];
    const exercise = session.exercises[0];
    state = updateSet(state, session.id, exercise.exerciseId, 1, { completed: true, weight: 80, reps: 14 });
    expect(session.exercises[0].prescribedSets[0].targetReps).toBe(15);
    expect(state.workoutSessions[0].exercises[0].performedSets[0]).toMatchObject({
      completed: true, weight: 80, reps: 14
    });
    saveState(state);
    expect(loadState().workoutSessions[0].exercises[0].performedSets[0].weight).toBe(80);
  });

  it("finds most recent completed performance and supports session completion", () => {
    let state = startWorkout(createInitialState(), 1, 1, new Date("2026-01-01T10:00:00Z"));
    const previousId = state.workoutSessions[0].id;
    const exerciseId = state.workoutSessions[0].exercises[0].exerciseId;
    state = updateSet(state, previousId, exerciseId, 1, { completed: true, weight: 60, reps: 15 });
    state = completeWorkout(state, previousId, new Date("2026-01-01T11:00:00Z"));
    state = startWorkout(state, 1, 2, new Date("2026-01-03T10:00:00Z"));
    expect(getPreviousPerformance(state.workoutSessions, exerciseId, state.workoutSessions[1].id)?.[0].weight).toBe(60);
    expect(countCompletedSets(state.workoutSessions[0])).toBe(1);
    expect(state.workoutSessions[0].durationSeconds).toBe(3600);
  });

  it("exports and merges valid data without replacing current unique sessions", () => {
    const existing = startWorkout(createInitialState(), 1, 1);
    const text = exportData(existing);
    const restored = importData(text, createInitialState());
    expect(restored.workoutSessions).toHaveLength(1);
    expect(importData(text, existing).workoutSessions).toHaveLength(1);
    expect(STORAGE_KEY).toBe("muscle-foundation-app:v1");
  });

  it("rejects malformed backups before merging", () => {
    const current = createInitialState();
    expect(() => importData(JSON.stringify({ schemaVersion: 1, workoutSessions: [{}], bodyMetrics: [], settings: {}, program: {}, weekNotes: {} }), current))
      .toThrow("invalid or incomplete");
    expect(() => importData(JSON.stringify({ schemaVersion: 2 }), current))
      .toThrow("newer version");
    expect(current.workoutSessions).toHaveLength(0);
  });

  it("preserves recorded units on weight entries", () => {
    let state = startWorkout(createInitialState(), 1, 1);
    const session = state.workoutSessions[0];
    const exercise = session.exercises[0];
    state = updateSet(state, session.id, exercise.exerciseId, 1, { completed: true, weight: 100, unit: "lb", reps: 15 });
    expect(state.workoutSessions[0].exercises[0].performedSets[0]).toMatchObject({ weight: 100, unit: "lb" });
  });

  it("marks the program complete after Week 12 Day 5", () => {
    const state = startWorkout(createInitialState(), 12, 5, new Date("2026-10-08T10:00:00Z"));
    const finished = completeWorkout(state, state.workoutSessions[0].id, new Date("2026-10-08T11:00:00Z"));
    expect(finished.program).toMatchObject({ currentWeek: 12, currentDay: 5, completed: true });
  });
});
