export interface GuideLink {
  programName: string;
  matchType: "exact" | "close" | "no_match";
  guideName?: string;
  url?: string;
}

export const GUIDE_SOURCE = { name: "Simply Fitness", url: "https://www.simplyfitness.com/pages/workout-exercise-guides" };

export const GUIDE_LINKS: GuideLink[] = [
  { programName: "Squats", matchType: "exact", guideName: "Squat", url: "https://www.simplyfitness.com/pages/squat" },
  { programName: "Bench Press", matchType: "exact", guideName: "Barbell Bench Press", url: "https://www.simplyfitness.com/pages/barbell-bench-press" },
  { programName: "Chin Ups", matchType: "close", guideName: "Pull Up", url: "https://www.simplyfitness.com/pages/pull-up" },
  { programName: "One Arm Dumbbell Rows", matchType: "exact", guideName: "Dumbbell Bent-Over Row (Single Arm)", url: "https://www.simplyfitness.com/pages/dumbbell-bent-over-row-single-arm" },
  { programName: "Standing Lateral Raise", matchType: "close", guideName: "Dumbbell Lateral Raise", url: "https://www.simplyfitness.com/pages/dumbbell-lateral-raise" },
  { programName: "Standing Front Raise", matchType: "close", guideName: "Dumbbell Front Raise", url: "https://www.simplyfitness.com/pages/dumbbell-front-raise" },
  { programName: "Standing Alternate Dumbbell Curl", matchType: "exact", guideName: "Alternating Dumbbell Curl", url: "https://www.simplyfitness.com/pages/alternating-dumbbell-curl" },
  { programName: "Incline Curls", matchType: "exact", guideName: "Incline Dumbbell Curl", url: "https://www.simplyfitness.com/pages/incline-dumbbell-curl" },
  { programName: "Incline Tricep Extension", matchType: "no_match" },
  { programName: "Tate Press", matchType: "no_match" },
  { programName: "Military Press", matchType: "close", guideName: "Standing Barbell Shoulder Press", url: "https://www.simplyfitness.com/pages/standing-barbell-shoulder-press" },
  { programName: "Flat Dumbbell Press", matchType: "exact", guideName: "Dumbbell Bench Press", url: "https://www.simplyfitness.com/pages/dumbbell-bench-press" },
  { programName: "Deadlifts", matchType: "exact", guideName: "Barbell Deadlift", url: "https://www.simplyfitness.com/pages/barbell-deadlift" },
  { programName: "High Pull", matchType: "no_match" },
  { programName: "Bent Lateral Raise", matchType: "exact", guideName: "Bent-Over Lateral Raise", url: "https://www.simplyfitness.com/pages/bent-over-lateral-raise" },
  { programName: "Wide Grip Pulldowns", matchType: "exact", guideName: "Wide-Grip Pulldown", url: "https://www.simplyfitness.com/pages/wide-grip-pulldown" },
  { programName: "Low Pulley Row", matchType: "close", guideName: "Seated Cable Row", url: "https://www.simplyfitness.com/pages/seated-cable-row" },
  { programName: "Overheard Tricep Extension", matchType: "close", guideName: "Dumbbell Overhead Triceps Extension", url: "https://www.simplyfitness.com/pages/dumbbell-overhead-triceps-extension" },
  { programName: "Lying Tricep Extension", matchType: "exact", guideName: "Lying Triceps Extension", url: "https://www.simplyfitness.com/pages/lying-triceps-extension" },
  { programName: "Barbell Curl", matchType: "exact", guideName: "Barbell Curl", url: "https://www.simplyfitness.com/pages/barbell-curl" },
  { programName: "Hammer Curl", matchType: "exact", guideName: "Hammer Curl", url: "https://www.simplyfitness.com/pages/hammer-curl" },
  { programName: "Hammer Curls", matchType: "exact", guideName: "Hammer Curl", url: "https://www.simplyfitness.com/pages/hammer-curl" },
  { programName: "Incline Bench Press", matchType: "exact", guideName: "Incline Barbell Bench Press", url: "https://www.simplyfitness.com/pages/incline-barbell-bench-press" },
  { programName: "Reverse Grip Pulldown", matchType: "exact", guideName: "Reverse-Grip Pulldown", url: "https://www.simplyfitness.com/pages/reverse-grip-pulldown" },
  { programName: "Low Pulley Row Wide Grip", matchType: "close", guideName: "Seated Cable Row", url: "https://www.simplyfitness.com/pages/seated-cable-row" },
  { programName: "Seated Lateral Raises", matchType: "close", guideName: "Dumbbell Lateral Raise", url: "https://www.simplyfitness.com/pages/dumbbell-lateral-raise" },
  { programName: "Seated Dumbell Curls", matchType: "close", guideName: "Alternating Dumbbell Curl", url: "https://www.simplyfitness.com/pages/alternating-dumbbell-curl" },
  { programName: "Concentration Curls", matchType: "exact", guideName: "Dumbbell Concentration Curl", url: "https://www.simplyfitness.com/pages/dumbbell-concentration-curl" },
  { programName: "Rope Pushdowns", matchType: "exact", guideName: "Cable Rope Pushdown", url: "https://www.simplyfitness.com/pages/cable-rope-puschdown" },
  { programName: "Lying Tricep Extension (dumbbell)", matchType: "exact", guideName: "Lying Dumbbell Triceps Extension", url: "https://www.simplyfitness.com/pages/lying-dumbbell-triceps-extension" },
  { programName: "Dumbbell Upright Row", matchType: "close", guideName: "Barbell Upright Row", url: "https://www.simplyfitness.com/pages/barbell-upright-row" },
  { programName: "One Arm Lateral Raises", matchType: "close", guideName: "Cable One-Arm Lateral Raise", url: "https://www.simplyfitness.com/pages/cable-one-arm-lateral-raise" },
  { programName: "Dips", matchType: "exact", guideName: "Parallel Dip Bar", url: "https://www.simplyfitness.com/pages/parallel-dip-bar" },
  { programName: "Cable Curls", matchType: "close", guideName: "Rope Cable Curl", url: "https://www.simplyfitness.com/pages/rope-cable-curl" },
  { programName: "Reverse Curls", matchType: "exact", guideName: "Reverse Barbell Curl", url: "https://www.simplyfitness.com/pages/reverse-barbell-curl" },
  { programName: "One Arm Dumbbell Row", matchType: "exact", guideName: "Dumbbell Bent-Over Row (Single Arm)", url: "https://www.simplyfitness.com/pages/dumbbell-bent-over-row-single-arm" },
  { programName: "Bent Lateral Raises", matchType: "exact", guideName: "Bent-Over Lateral Raise", url: "https://www.simplyfitness.com/pages/bent-over-lateral-raise" },
  { programName: "Plate Front Raises", matchType: "close", guideName: "Barbell Front Raise", url: "https://www.simplyfitness.com/pages/barbell-front-raise" },
  { programName: "Barbell Curls", matchType: "exact", guideName: "Barbell Curl", url: "https://www.simplyfitness.com/pages/barbell-curl" },
  { programName: "Standing Dumbbell Curls", matchType: "close", guideName: "Alternating Dumbbell Curl", url: "https://www.simplyfitness.com/pages/alternating-dumbbell-curl" },
  { programName: "Lying Tricep Extensions", matchType: "exact", guideName: "Lying Triceps Extension", url: "https://www.simplyfitness.com/pages/lying-triceps-extension" },
  { programName: "Wide Grip Pulldown", matchType: "exact", guideName: "Wide-Grip Pulldown", url: "https://www.simplyfitness.com/pages/wide-grip-pulldown" },
  { programName: "Lying Tricep Extension (dumbbells)", matchType: "exact", guideName: "Lying Dumbbell Triceps Extension", url: "https://www.simplyfitness.com/pages/lying-dumbbell-triceps-extension" },
];
