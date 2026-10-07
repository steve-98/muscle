import { ALL_EXERCISE_IDS, PROGRAM, getExercise } from "./program";
import { GUIDE_LINKS, type GuideLink } from "./guideLinks";

const norm = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const aliases: Record<string, string> = {
  "overheard-tricep-extension": "Overhead Tricep Extension",
  "seated-dumbbell-curls": "Seated Dumbbell Curls",
  "lying-tricep-extension-dumbbell": "Lying Tricep Extension (Dumbbell)"
};

const groups: Record<string, [string, string, string]> = {
  "squats": ["Legs", "Glutes, core", "Barbell"],
  "bench-press": ["Chest", "Triceps, shoulders", "Barbell, bench"],
  "chin-ups": ["Back", "Biceps", "Pull-up bar"],
  "one-arm-dumbbell-rows": ["Back", "Biceps, rear deltoids", "Dumbbell, bench"],
  "standing-lateral-raise": ["Shoulders", "Traps", "Dumbbells"],
  "standing-front-raise": ["Shoulders", "Upper chest", "Dumbbells"],
  "standing-alternate-dumbbell-curl": ["Biceps", "Forearms", "Dumbbells"],
  "incline-curls": ["Biceps", "Forearms", "Incline bench, dumbbells"],
  "incline-tricep-extension": ["Triceps", "Shoulders", "Dumbbells"],
  "tate-press": ["Triceps", "Chest", "Dumbbells, bench"],
  "military-press": ["Shoulders", "Triceps, core", "Barbell"],
  "flat-dumbbell-press": ["Chest", "Triceps, shoulders", "Dumbbells, bench"],
  "deadlifts": ["Posterior chain", "Back, core, grip", "Barbell"],
  "high-pull": ["Shoulders", "Traps, upper back", "Barbell"],
  "bent-lateral-raise": ["Shoulders", "Upper back", "Dumbbells"],
  "wide-grip-pulldowns": ["Back", "Biceps", "Cable machine"],
  "low-pulley-row": ["Back", "Biceps", "Cable machine"],
  "overheard-tricep-extension": ["Triceps", "Shoulders", "Cable or dumbbell"],
  "lying-tricep-extension": ["Triceps", "Shoulders", "Barbell or dumbbells"],
  "barbell-curl": ["Biceps", "Forearms", "Barbell"],
  "hammer-curl": ["Biceps", "Forearms", "Dumbbells"],
  "incline-bench-press": ["Chest", "Triceps, shoulders", "Barbell, incline bench"],
  "reverse-grip-pulldown": ["Back", "Biceps", "Cable machine"],
  "low-pulley-row-wide-grip": ["Back", "Rear deltoids", "Cable machine"],
  "seated-lateral-raises": ["Shoulders", "Traps", "Dumbbells"],
  "seated-dumbbell-curls": ["Biceps", "Forearms", "Dumbbells"],
  "concentration-curls": ["Biceps", "Forearms", "Dumbbell"],
  "rope-pushdowns": ["Triceps", "Forearms", "Cable machine, rope"],
  "lying-tricep-extension-dumbbell": ["Triceps", "Shoulders", "Dumbbells, bench"],
  "dumbbell-upright-row": ["Shoulders", "Traps", "Dumbbells"],
  "one-arm-lateral-raises": ["Shoulders", "Traps", "Dumbbell"],
  "dips": ["Triceps", "Chest, shoulders", "Dip bars"],
  "cable-curls": ["Biceps", "Forearms", "Cable machine"],
  "reverse-curls": ["Forearms", "Biceps", "Barbell or dumbbells"],
  "one-arm-dumbbell-row": ["Back", "Biceps, rear deltoids", "Dumbbell, bench"],
  "bent-lateral-raises": ["Shoulders", "Upper back", "Dumbbells"],
  "plate-front-raises": ["Shoulders", "Upper chest", "Weight plate"],
  "barbell-curls": ["Biceps", "Forearms", "Barbell"],
  "standing-dumbbell-curls": ["Biceps", "Forearms", "Dumbbells"],
  "lying-tricep-extensions": ["Triceps", "Shoulders", "Barbell or dumbbells"],
  "wide-grip-pulldown": ["Back", "Biceps", "Cable machine"],
  "lying-tricep-extension-dumbbells": ["Triceps", "Shoulders", "Dumbbells, bench"]
};

export interface ExerciseReference {
  id: string;
  sourceName: string;
  alias?: string;
  primary: string;
  secondary: string;
  equipment: string;
  description: string;
  cues: string[];
  usage: string;
  imageSource: string;
  guide?: GuideLink;
}

export const EXERCISES: ExerciseReference[] = ALL_EXERCISE_IDS.map((id) => {
  const record = getExercise(id);
  if (!record) throw new Error(`Missing exercise data for ${id}`);
  const [primary, secondary, equipment] = groups[id] ?? ["Full body", "Supporting muscles", "Varies"];
  const usage = PROGRAM.weeks.flatMap((week) => week.days
    .filter((day) => day.exercises.some((item) => item.exerciseId === id))
    .map((day) => `W${week.weekNumber} D${day.dayNumber}`)).join(", ");
  return {
    id,
    sourceName: record.sourceName,
    ...(aliases[id] ? { alias: aliases[id] } : {}),
    primary,
    secondary,
    equipment,
    description: `${record.sourceName} is included in the source program. Technique details here are supplemental reference information, not part of the PDF prescription.`,
    cues: ["Use a controlled range of motion.", "Choose a stable, comfortable position.", "Stop if you feel sharp pain."],
    usage,
    imageSource: "No licensed local image included; exercise placeholder used.",
    guide: GUIDE_LINKS.find((link) => norm(link.programName) === norm(record.sourceName))
  };
});

export function searchExercises(query: string): ExerciseReference[] {
  const normalized = query.trim().toLocaleLowerCase();
  return EXERCISES.filter((item) =>
    !normalized || `${item.sourceName} ${item.alias ?? ""} ${item.primary} ${item.secondary} ${item.equipment}`
      .toLocaleLowerCase().includes(normalized)
  ).sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}
