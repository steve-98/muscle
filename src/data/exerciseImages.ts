export interface ExerciseImage {
  dbId: string;
  name: string;
  similar?: boolean;
}

export const IMAGE_SOURCE = {
  name: "free-exercise-db",
  url: "https://github.com/yuhonas/free-exercise-db",
  license: "Unlicense (public domain)"
};

const m = (dbId: string, name: string, similar = false): ExerciseImage => ({ dbId, name, ...(similar ? { similar } : {}) });

const squat = m("Barbell_Squat", "Barbell Squat");
const oneArmRow = m("One-Arm_Dumbbell_Row", "One-Arm Dumbbell Row");
const bentRaise = m("Seated_Bent-Over_Rear_Delt_Raise", "Seated Bent-Over Rear Delt Raise", true);
const barbellCurl = m("Barbell_Curl", "Barbell Curl");
const hammer = m("Hammer_Curls", "Hammer Curls");
const lyingDb = m("Lying_Dumbbell_Tricep_Extension", "Lying Dumbbell Tricep Extension");
const lyingBar = m("EZ-Bar_Skullcrusher", "EZ-Bar Skullcrusher", true);
const wideLat = m("Wide-Grip_Lat_Pulldown", "Wide-Grip Lat Pulldown");
const lowRow = m("Seated_Cable_Rows", "Seated Cable Rows");

export const EXERCISE_IMAGES: Record<string, ExerciseImage> = {
  "Squats": squat,
  "Bench Press": m("Barbell_Bench_Press_-_Medium_Grip", "Barbell Bench Press - Medium Grip"),
  "Chin Ups": m("Chin-Up", "Chin-Up"),
  "One Arm Dumbbell Rows": oneArmRow,
  "One Arm Dumbbell Row": oneArmRow,
  "Standing Lateral Raise": m("Side_Lateral_Raise", "Side Lateral Raise"),
  "Standing Front Raise": m("Front_Dumbbell_Raise", "Front Dumbbell Raise"),
  "Standing Alternate Dumbbell Curl": m("Dumbbell_Alternate_Bicep_Curl", "Dumbbell Alternate Bicep Curl"),
  "Incline Curls": m("Incline_Dumbbell_Curl", "Incline Dumbbell Curl"),
  "Incline Tricep Extension": m("Incline_Barbell_Triceps_Extension", "Incline Barbell Triceps Extension", true),
  "Tate Press": m("Tate_Press", "Tate Press"),
  "Military Press": m("Standing_Military_Press", "Standing Military Press"),
  "Flat Dumbbell Press": m("Dumbbell_Bench_Press", "Dumbbell Bench Press"),
  "Deadlifts": m("Barbell_Deadlift", "Barbell Deadlift"),
  "Bent Lateral Raise": bentRaise,
  "Bent Lateral Raises": bentRaise,
  "Wide Grip Pulldown": wideLat,
  "Wide Grip Pulldowns": wideLat,
  "Low Pulley Row": lowRow,
  "Low Pulley Row Wide Grip": { ...lowRow, similar: true },
  "Overheard Tricep Extension": m("Cable_Rope_Overhead_Triceps_Extension", "Cable Rope Overhead Triceps Extension", true),
  "Lying Tricep Extension": lyingBar,
  "Lying Tricep Extensions": lyingBar,
  "Lying Tricep Extension (dumbbell)": lyingDb,
  "Lying Tricep Extension (dumbbells)": lyingDb,
  "Barbell Curl": barbellCurl,
  "Barbell Curls": barbellCurl,
  "Hammer Curl": hammer,
  "Hammer Curls": hammer,
  "Incline Bench Press": m("Barbell_Incline_Bench_Press_-_Medium_Grip", "Barbell Incline Bench Press - Medium Grip"),
  "Reverse Grip Pulldown": m("Underhand_Cable_Pulldowns", "Underhand Cable Pulldowns"),
  "Seated Lateral Raises": m("Seated_Side_Lateral_Raise", "Seated Side Lateral Raise"),
  "Seated Dumbell Curls": m("Seated_Dumbbell_Curl", "Seated Dumbbell Curl"),
  "Concentration Curls": m("Concentration_Curls", "Concentration Curls"),
  "Rope Pushdowns": m("Triceps_Pushdown_-_Rope_Attachment", "Triceps Pushdown - Rope Attachment"),
  "Dumbbell Upright Row": m("Standing_Dumbbell_Upright_Row", "Standing Dumbbell Upright Row"),
  "One Arm Lateral Raises": m("One-Arm_Side_Laterals", "One-Arm Side Laterals"),
  "Dips": m("Dips_-_Triceps_Version", "Dips - Triceps Version"),
  "Cable Curls": m("Standing_Biceps_Cable_Curl", "Standing Biceps Cable Curl"),
  "Reverse Curls": m("Reverse_Barbell_Curl", "Reverse Barbell Curl"),
  "Plate Front Raises": m("Front_Plate_Raise", "Front Plate Raise"),
  "Standing Dumbbell Curls": m("Dumbbell_Bicep_Curl", "Dumbbell Bicep Curl")
};

export function imageUrls(image: ExerciseImage): [string, string] {
  const base = `${import.meta.env.BASE_URL}exercises/${image.dbId}`;
  return [`${base}_0.jpg`, `${base}_1.jpg`];
}
