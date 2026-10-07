import type { ProgramDay, ProgramExercise, ProgramWeek, SetPrescription } from "../types";

const prescriptions = (groups: Array<[number, number, number]>): SetPrescription[] =>
  groups.flatMap(([count, targetReps, restSeconds]) =>
    Array.from({ length: count }, () => ({ targetReps, restSeconds }))
  ).map((set, index) => ({ ...set, setNumber: index + 1 }));

const exercise = (sourceName: string, sets: SetPrescription[]): ProgramExercise => ({
  exerciseId: exerciseId(sourceName),
  sourceName,
  sets
});

export const exerciseId = (sourceName: string): string =>
  sourceName.toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-dumbell-/g, "-dumbbell-");

const majorSets = (phase: 1 | 2 | 3): SetPrescription[] => {
  const groups: Record<1 | 2 | 3, Array<[number, number, number]>> = {
    1: [[1, 15, 60], [2, 12, 90], [1, 10, 120], [5, 7, 180]],
    2: [[1, 15, 60], [2, 10, 90], [1, 8, 120], [5, 5, 180]],
    3: [[1, 12, 60], [2, 8, 90], [1, 6, 120], [5, 3, 180]]
  };
  return prescriptions(groups[phase]);
};

const militaryPressSets = prescriptions([[1, 15, 60], [2, 12, 90], [1, 10, 120], [5, 7, 180]]);
const deadliftSets = (phase: 1 | 2 | 3) =>
  prescriptions([[2, 8, 90], [2, 6, 90], [5, phase === 3 ? 3 : 5, 180]]);

const simpleExercise = (name: string, reps: number, rest = 90) =>
  exercise(name, prescriptions([[4, reps, rest]]));

const day = (dayNumber: number, exercises: ProgramExercise[]): ProgramDay => ({ dayNumber, exercises });

function createWeekOneToFour(weekNumber: number): ProgramWeek {
  const compound = majorSets(1);
  const hypertrophy = (name: string, reps: number, rest = 90) => simpleExercise(name, reps, rest);
  const arm = (name: string) => hypertrophy(name, 8, 120);
  return {
    weekNumber,
    days: [
      day(1, [exercise("Squats", compound), exercise("Bench Press", compound)]),
      day(2, [
        hypertrophy("Chin Ups", 12),
        hypertrophy("One Arm Dumbbell Rows", 12),
        hypertrophy("Standing Lateral Raise", 12),
        hypertrophy("Standing Front Raise", 12),
        arm("Standing Alternate Dumbbell Curl"),
        arm("Incline Curls"),
        arm("Incline Tricep Extension"),
        arm("Tate Press")
      ]),
      day(3, [
        exercise("Military Press", militaryPressSets),
        hypertrophy("Flat Dumbbell Press", 8, 120),
        exercise("Deadlifts", deadliftSets(1))
      ]),
      day(4, [
        hypertrophy("High Pull", 12),
        hypertrophy("Bent Lateral Raise", 12),
        hypertrophy("Wide Grip Pulldowns", 12),
        hypertrophy("Low Pulley Row", 12),
        arm("Overheard Tricep Extension"),
        arm("Lying Tricep Extension"),
        arm("Barbell Curl"),
        arm("Hammer Curl")
      ]),
      day(5, [exercise("Squats", compound), exercise("Incline Bench Press", compound)])
    ]
  };
}

function createWeekFiveToEight(weekNumber: number): ProgramWeek {
  const compound = majorSets(2);
  const regular = (name: string, reps = 10) => simpleExercise(name, reps);
  return {
    weekNumber,
    days: [
      day(1, [exercise("Squats", compound), exercise("Bench Press", compound)]),
      day(2, [
        regular("Reverse Grip Pulldown"),
        regular("Low Pulley Row Wide Grip"),
        regular("Seated Lateral Raises"),
        regular("Bent Lateral Raise"),
        regular("Seated Dumbell Curls"),
        regular("Concentration Curls"),
        regular("Rope Pushdowns"),
        regular("Lying Tricep Extension (dumbbell)")
      ]),
      day(3, [
        exercise("Military Press", militaryPressSets),
        regular("Flat Dumbbell Press", 10),
        exercise("Deadlifts", deadliftSets(2))
      ]),
      day(4, [
        regular("Dumbbell Upright Row"),
        regular("One Arm Lateral Raises"),
        regular("One Arm Dumbbell Rows"),
        regular("Chin Ups"),
        regular("Tate Press"),
        regular("Dips"),
        regular("Cable Curls"),
        regular("Reverse Curls")
      ]),
      day(5, [exercise("Squats", compound), exercise("Incline Bench Press", compound)])
    ]
  };
}

function createWeekNineToEleven(weekNumber: number, isWeekTwelve = false): ProgramWeek {
  const compound = majorSets(3);
  const rowsAndPulls = (name: string, reps = 8, rest = 120) => simpleExercise(name, reps, rest);
  const accessories = (name: string) => simpleExercise(name, 12);
  const dayTwoReps = isWeekTwelve ? 12 : undefined;
  const dayTwo = [
    rowsAndPulls("One Arm Dumbbell Row", dayTwoReps ?? 8, isWeekTwelve ? 90 : 120),
    rowsAndPulls("Chin Ups", dayTwoReps ?? 8, isWeekTwelve ? 90 : 120),
    accessories("Bent Lateral Raises"),
    accessories("Plate Front Raises"),
    accessories("Barbell Curls"),
    accessories("Standing Dumbbell Curls"),
    accessories("Lying Tricep Extensions"),
    accessories("Rope Pushdowns")
  ];
  return {
    weekNumber,
    days: [
      day(1, [exercise("Squats", compound), exercise("Bench Press", compound)]),
      day(2, dayTwo),
      day(3, [
        exercise("Military Press", militaryPressSets),
        rowsAndPulls("Flat Dumbbell Press", 12),
        exercise("Deadlifts", deadliftSets(3))
      ]),
      day(4, [
        simpleExercise("Dumbbell Upright Row", 10),
        simpleExercise("One Arm Lateral Raises", 10),
        rowsAndPulls("Wide Grip Pulldown"),
        rowsAndPulls("Low Pulley Row"),
        accessories("Tate Press"),
        accessories("Lying Tricep Extension (dumbbells)"),
        accessories("Hammer Curls"),
        accessories("Incline Curls")
      ]),
      day(5, [exercise("Squats", compound), exercise("Incline Bench Press", compound)])
    ]
  };
}

export const PROGRAM: {
  id: string;
  name: string;
  author: string;
  durationWeeks: number;
  daysPerWeek: number;
  weeks: ProgramWeek[];
} = {
  id: "muscle-building-foundation",
  name: "Muscle Building Foundation",
  author: "John Barban",
  durationWeeks: 12,
  daysPerWeek: 5,
  weeks: [
    ...Array.from({ length: 4 }, (_, i) => createWeekOneToFour(i + 1)),
    ...Array.from({ length: 4 }, (_, i) => createWeekFiveToEight(i + 5)),
    ...Array.from({ length: 3 }, (_, i) => createWeekNineToEleven(i + 9)),
    createWeekNineToEleven(12, true)
  ]
};

export function getWorkout(week: number, dayNumber: number): ProgramDay | undefined {
  if (!Number.isInteger(week) || !Number.isInteger(dayNumber)) return undefined;
  return PROGRAM.weeks.find((entry) => entry.weekNumber === week)?.days.find((entry) => entry.dayNumber === dayNumber);
}

export function getExercise(exerciseIdValue: string): ProgramExercise | undefined {
  return PROGRAM.weeks.flatMap((week) => week.days.flatMap((programDay) => programDay.exercises))
    .find((entry) => entry.exerciseId === exerciseIdValue);
}

export const ALL_EXERCISE_IDS = [...new Set(
  PROGRAM.weeks.flatMap((week) => week.days.flatMap((programDay) => programDay.exercises.map((item) => item.exerciseId)))
)];
