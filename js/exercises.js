// ---- exercise library ----
const BUILTIN_EXERCISES = [
  // ---- push: wall -> incline -> floor -> rings ----
  { id: "wall-pushup", name: "Wall push-up", muscle_group: "push", equipment: "bodyweight", cue: "Hands on wall at shoulder height, straight line body." },
  { id: "incline-pushup-high", name: "Incline push-up (high)", muscle_group: "push", equipment: "bodyweight", cue: "Hands on a counter/high surface, full range." },
  { id: "incline-pushup", name: "Incline push-up", muscle_group: "push", equipment: "bodyweight", cue: "Hands on a bench/step, full range of motion." },
  { id: "knee-pushup", name: "Knee push-up", muscle_group: "push", equipment: "bodyweight", cue: "Straight line knees-to-shoulders, chest to floor." },
  { id: "pushup", name: "Push-up", muscle_group: "push", equipment: "bodyweight", cue: "Elbows ~45°, brace core, chest to floor." },
  { id: "diamond-pushup", name: "Diamond push-up", muscle_group: "push", equipment: "bodyweight", cue: "Hands under chest, elbows track back." },
  { id: "decline-pushup", name: "Decline push-up", muscle_group: "push", equipment: "bodyweight", cue: "Feet elevated on a chair/step, more load up top." },
  { id: "archer-pushup", name: "Archer push-up", muscle_group: "push", equipment: "bodyweight", cue: "Shift weight to one side each rep, other arm stays long." },
  { id: "pseudo-planche-pushup", name: "Pseudo planche push-up", muscle_group: "push", equipment: "bodyweight", cue: "Hands by hips, lean forward past your fingertips." },
  { id: "one-arm-pushup-assisted", name: "One-arm push-up (assisted)", muscle_group: "push", equipment: "bodyweight", cue: "Other hand lightly on a ball/step for balance only." },
  { id: "pike-pushup", name: "Pike push-up", muscle_group: "push", equipment: "bodyweight", cue: "Hips high, crown of head toward floor." },
  { id: "decline-pike-pushup", name: "Decline pike push-up", muscle_group: "push", equipment: "bodyweight", cue: "Feet elevated, more load on shoulders." },
  { id: "wall-walk-handstand-prep", name: "Wall walk-up practice", muscle_group: "push", equipment: "bodyweight", cue: "From plank, walk your feet up the wall until hips stack over shoulders, hold briefly, then walk back down — build comfort being inverted before you kick up. Rung 1 of the handstand line." },
  { id: "wall-handstand-hold", name: "Wall handstand hold", muscle_group: "push", equipment: "bodyweight", cue: "Chest to wall, brace and hold — rung 2 of the handstand line." },
  { id: "wall-handstand-hold-back", name: "Wall handstand hold (facing away)", muscle_group: "push", equipment: "bodyweight", cue: "Back to wall, heels light against it — less visual/tactile feedback than facing in, harder to balance." },
  { id: "freestanding-handstand-practice", name: "Freestanding handstand kick-ups", muscle_group: "push", equipment: "bodyweight", cue: "Near a wall as a spotter, kick up to a brief freestanding balance and catch yourself before falling — attempts, not a held hold." },
  { id: "freestanding-handstand-hold", name: "Freestanding handstand hold", muscle_group: "push", equipment: "bodyweight", cue: "No wall — small finger and wrist pressure adjustments to balance, build hold time gradually." },
  { id: "handstand-pushup-negative", name: "Wall handstand push-up negative", muscle_group: "push", equipment: "bodyweight", cue: "Chest to wall, lower for a slow 4-5 count, then walk back down rather than pressing up — eccentric only." },
  { id: "handstand-pushup", name: "Wall handstand push-up", muscle_group: "push", equipment: "bodyweight", cue: "Chest to wall, controlled descent, press to lockout." },
  { id: "ring-pushup-easy", name: "Ring push-up (feet forward)", muscle_group: "push", equipment: "rings", cue: "Body angled upright — easier version to learn ring stability." },
  { id: "ring-pushup", name: "Ring push-up", muscle_group: "push", equipment: "rings", cue: "Elbows at 45°, turn rings out at lockout." },
  { id: "ring-archer-pushup", name: "Ring archer push-up", muscle_group: "push", equipment: "rings", cue: "One ring stays high while the other descends." },
  { id: "ring-typewriter-pushup", name: "Ring typewriter push-up", muscle_group: "push", equipment: "rings", cue: "Stay low, shift side to side without rising." },
  { id: "ring-dip-supported", name: "Supported ring dip", muscle_group: "push", equipment: "rings", cue: "Feet on floor taking some weight, build dip control." },
  { id: "ring-dip", name: "Ring dip", muscle_group: "push", equipment: "rings", cue: "Control the bottom, avoid shoulder roll." },
  { id: "ring-dip-weighted", name: "Weighted ring dip", muscle_group: "push", equipment: "rings", cue: "Add load once bodyweight dips are smooth for reps." },
  { id: "db-floor-press", name: "Dumbbell floor press", muscle_group: "push", equipment: "dumbbell", cue: "Upper arms touch floor lightly, press to lockout." },
  { id: "db-overhead-press", name: "Dumbbell overhead press", muscle_group: "push", equipment: "dumbbell", cue: "Brace core, press straight overhead, avoid arching." },

  // ---- pull: dead hang -> rings (no fixed bar in the equipment list — every
  // hang/pull-up/chin-up variant below is done on rings) ----
  { id: "dead-hang", name: "Dead hang", muscle_group: "pull", equipment: "rings", cue: "Shoulders engaged, don't fully relax into the joint." },
  { id: "active-hang", name: "Active hang", muscle_group: "pull", equipment: "rings", cue: "Pull shoulder blades down and back, hold." },
  { id: "scap-pull", name: "Scapular pull-up", muscle_group: "pull", equipment: "rings", cue: "Pull shoulder blades down without bending elbows." },
  { id: "band-assisted-pullup", name: "Band-assisted pull-up", muscle_group: "pull", equipment: "band", cue: "Band under knee/foot, full range each rep." },
  { id: "negative-pullup", name: "Negative pull-up", muscle_group: "pull", equipment: "rings", cue: "Jump to top, lower for a slow 4-5 count." },
  { id: "chinup", name: "Chin-up", muscle_group: "pull", equipment: "rings", cue: "Underhand grip, drive elbows down." },
  { id: "typewriter-pullup", name: "Typewriter pull-up", muscle_group: "pull", equipment: "rings", cue: "Hold at top, shift side to side without dropping." },
  { id: "one-arm-pullup-assisted", name: "One-arm pull-up (band assisted)", muscle_group: "pull", equipment: "band", cue: "Band takes most of the load on the free side." },
  { id: "ring-row-easy", name: "Ring row (feet forward)", muscle_group: "pull", equipment: "rings", cue: "More upright body angle — easier version." },
  { id: "ring-row", name: "Ring row", muscle_group: "pull", equipment: "rings", cue: "Body straight, pull chest to hands." },
  { id: "ring-row-feet-elevated", name: "Ring row (feet elevated)", muscle_group: "pull", equipment: "rings", cue: "Feet on a bench — more horizontal, more load." },
  { id: "ring-pullup-assisted", name: "Ring pull-up (feet supported)", muscle_group: "pull", equipment: "rings", cue: "Feet lightly touching floor, build toward full ring pull-up." },
  { id: "ring-pullup", name: "Ring pull-up", muscle_group: "pull", equipment: "rings", cue: "Rings add instability — brace through the whole pull." },
  { id: "ring-archer-pullup", name: "Ring archer pull-up", muscle_group: "pull", equipment: "rings", cue: "Advanced — one arm dominant, other stays extended." },
  { id: "band-pull-apart", name: "Band pull-apart", muscle_group: "pull", equipment: "band", cue: "Squeeze shoulder blades, slow return." },
  { id: "db-single-arm-row", name: "Single-arm dumbbell row", muscle_group: "pull", equipment: "dumbbell", cue: "Flat back, pull elbow past hip, no torso rotation." },
  { id: "db-renegade-row", name: "Renegade row", muscle_group: "pull", equipment: "dumbbell", cue: "Plank position, minimize hip sway as you row." },
  { id: "weighted-pullup", name: "Weighted pull-up", muscle_group: "pull", equipment: "dumbbell", cue: "Dumbbell between feet or on a belt, full range." },

  // ---- pull: no equipment at all (for travel mode) ----
  // Every pull above needs rings, a band or dumbbells, which left travel mode
  // with no real bodyweight pull at all. These use only the floor, a towel, a
  // sturdy door/doorframe/table, or a backpack. They are lighter than ring
  // pulls (there's nothing hanging to pull your whole bodyweight against),
  // so they hold your pulling and posture muscles in place on the road
  // rather than building strength.
  { id: "towel-pull-apart", name: "Towel pull-apart", muscle_group: "pull", equipment: "bodyweight", cue: "Hold a towel taut in both hands, pull it apart and squeeze your shoulder blades back." },
  { id: "prone-t-raise", name: "Prone T raise", muscle_group: "pull", equipment: "bodyweight", cue: "Face down, arms out to the sides, lift arms with thumbs up and squeeze shoulder blades." },
  { id: "prone-y-raise", name: "Prone Y raise", muscle_group: "pull", equipment: "bodyweight", cue: "Face down, arms overhead in a Y, lift arms off the floor without shrugging." },
  { id: "superman-pulldown", name: "Superman pulldown", muscle_group: "pull", equipment: "bodyweight", cue: "Face down, arms overhead and lifted, pull elbows down to your ribs like a pulldown." },
  { id: "reverse-snow-angel", name: "Reverse snow angel", muscle_group: "pull", equipment: "bodyweight", cue: "Face down, chest lifted, sweep straight arms from overhead down to your hips." },
  { id: "doorframe-row", name: "Doorframe row", muscle_group: "pull", equipment: "bodyweight", cue: "Hold both sides of a sturdy doorframe, lean back with a straight body and row your chest to your hands." },
  { id: "backpack-row", name: "Single-arm backpack row", muscle_group: "pull", equipment: "bodyweight", cue: "Pack loaded with water bottles or books. Flat back, pull elbow past hip, no twisting." },
  { id: "towel-door-row", name: "Towel door row", muscle_group: "pull", equipment: "bodyweight", cue: "Loop a towel around a closed door's handle on your side, lean back and row. Check the door is shut and sturdy." },
  { id: "table-row", name: "Table row", muscle_group: "pull", equipment: "bodyweight", cue: "Lie under a sturdy table, grip the edge, keep your body straight and pull your chest up. Check the table first." },

  // ---- more no-equipment options (fills thin spots in push / legs / hinge / core) ----
  { id: "wall-pushup-feet-back", name: "Wall push-up (feet back)", muscle_group: "push", equipment: "bodyweight", cue: "Feet a couple of steps from the wall, body straight, chest to the wall." },
  { id: "pike-pushup-hands-elevated", name: "Pike push-up (hands elevated)", muscle_group: "push", equipment: "bodyweight", cue: "Hands on a sturdy chair or bed, hips high, lower your head between your hands." },
  { id: "staggered-pushup", name: "Staggered-hands push-up", muscle_group: "push", equipment: "bodyweight", cue: "One hand a palm-length ahead of the other, switch sides each set." },
  { id: "tempo-pushup", name: "Push-up (3-second lower)", muscle_group: "push", equipment: "bodyweight", cue: "Count three on the way down, pause an instant, press up." },
  { id: "hindu-pushup", name: "Hindu push-up", muscle_group: "push", equipment: "bodyweight", cue: "From pike, swoop chest forward and up toward cobra, then reverse back to pike." },
  { id: "sit-to-stand", name: "Sit-to-stand (chair)", muscle_group: "legs", equipment: "bodyweight", cue: "Sit on a chair edge, stand without using your hands, lower slowly." },
  { id: "step-up-low", name: "Step-up (low)", muscle_group: "legs", equipment: "bodyweight", cue: "Whole foot on a low step, drive through the heel, control the way down." },
  { id: "reverse-lunge", name: "Reverse lunge", muscle_group: "legs", equipment: "bodyweight", cue: "Step back, back knee hovers just above the floor, drive through the front heel." },
  { id: "step-up-high", name: "Step-up (high step)", muscle_group: "legs", equipment: "bodyweight", cue: "Knee-height step, push only through the top leg, no push-off from the floor foot." },
  { id: "lateral-lunge", name: "Lateral lunge", muscle_group: "legs", equipment: "bodyweight", cue: "Step wide, sit back into one hip with the other leg straight, push back to center." },
  { id: "skater-squat", name: "Skater squat", muscle_group: "legs", equipment: "bodyweight", cue: "Stand on one leg, sweep the other back and lower until your knee nearly touches the floor." },
  { id: "hip-hinge-drill", name: "Hip hinge drill", muscle_group: "hinge", equipment: "bodyweight", cue: "Hands on hips, push hips back with a flat back and soft knees, stand tall." },
  { id: "prone-leg-raise", name: "Prone leg raise", muscle_group: "hinge", equipment: "bodyweight", cue: "Face down, squeeze glutes and lift one straight leg a few inches, alternate." },
  { id: "donkey-kick", name: "Donkey kick", muscle_group: "hinge", equipment: "bodyweight", cue: "On hands and knees, press one heel to the ceiling, hips level, no arching." },
  { id: "glute-bridge-march", name: "Glute bridge march", muscle_group: "hinge", equipment: "bodyweight", cue: "Hold a high bridge, lift one foot at a time without letting your hips drop." },
  { id: "towel-hamstring-curl", name: "Towel hamstring curl", muscle_group: "hinge", equipment: "bodyweight", cue: "Heels on a towel on a smooth floor, bridge up and slide your heels in and out." },
  { id: "single-leg-towel-hamstring-curl", name: "Single-leg towel hamstring curl", muscle_group: "hinge", equipment: "bodyweight", cue: "One heel on a towel, other leg raised, bridge up and slide the heel in and out." },
  { id: "v-up", name: "V-up", muscle_group: "core", equipment: "bodyweight", cue: "Lie flat, lift legs and chest together to meet in a V, lower with control." },
  { id: "hollow-rock", name: "Hollow rock", muscle_group: "core", equipment: "bodyweight", cue: "Hold a hollow body shape and rock back and forth without losing it." },
  { id: "plank-to-pike", name: "Plank to pike", muscle_group: "core", equipment: "bodyweight", cue: "From plank, lift hips high by pulling your feet toward your hands, then return." },
  { id: "side-plank-leg-raise", name: "Side plank leg raise", muscle_group: "core", equipment: "bodyweight", cue: "In a side plank, lift the top leg and lower it slowly, hips stay high." },
  { id: "long-lever-plank", name: "Long-lever plank", muscle_group: "core", equipment: "bodyweight", cue: "Plank with hands set well ahead of your shoulders, body straight, squeeze everything." },

  // ---- legs: wall sit -> bodyweight -> pistol -> rings-assisted ----
  { id: "wall-sit", name: "Wall sit", muscle_group: "legs", equipment: "bodyweight", cue: "Thighs parallel to floor, back flat against wall." },
  { id: "box-squat-high", name: "Box squat (high box)", muscle_group: "legs", equipment: "bodyweight", cue: "Sit back to the box, stand tall each rep." },
  { id: "bodyweight-squat", name: "Bodyweight squat", muscle_group: "legs", equipment: "bodyweight", cue: "Knees track toes, hips back and down." },
  { id: "split-squat", name: "Split squat", muscle_group: "legs", equipment: "bodyweight", cue: "Torso upright, controlled descent." },
  { id: "bulgarian-split-squat", name: "Bulgarian split squat", muscle_group: "legs", equipment: "bodyweight", cue: "Torso upright, front knee tracks toe." },
  { id: "shrimp-squat", name: "Shrimp squat", muscle_group: "legs", equipment: "bodyweight", cue: "Back knee toward floor, stay controlled." },
  { id: "ring-assisted-pistol", name: "Ring-assisted pistol squat", muscle_group: "legs", equipment: "rings", cue: "Hold rings lightly for balance, not to pull yourself up." },
  { id: "box-pistol", name: "Box pistol squat", muscle_group: "legs", equipment: "bodyweight", cue: "Sit to a box on one leg, stand without the other foot helping." },
  { id: "pistol-squat", name: "Pistol squat", muscle_group: "legs", equipment: "bodyweight", cue: "Full range on one leg, other leg stays extended." },
  { id: "jump-squat", name: "Jump squat", muscle_group: "legs", equipment: "bodyweight", cue: "Soft landing, immediately reset stance." },
  { id: "db-goblet-squat", name: "Goblet squat", muscle_group: "legs", equipment: "dumbbell", cue: "Hold weight at chest, elbows inside knees at bottom." },
  { id: "db-lunge", name: "Dumbbell lunge", muscle_group: "legs", equipment: "dumbbell", cue: "Step long enough that front shin stays vertical." },
  { id: "db-step-up", name: "Dumbbell step-up", muscle_group: "legs", equipment: "dumbbell", cue: "Drive through the heel of the working leg." },
  { id: "db-weighted-pistol", name: "Weighted pistol squat", muscle_group: "legs", equipment: "dumbbell", cue: "Hold a dumbbell at chest once bodyweight pistols are smooth." },

  // ---- hinge ----
  { id: "glute-bridge", name: "Glute bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "Squeeze glutes at top, avoid overarching low back." },
  { id: "single-leg-glute-bridge", name: "Single-leg glute bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "Hips level throughout, squeeze at top." },
  { id: "hip-thrust-bw", name: "Bodyweight hip thrust", muscle_group: "hinge", equipment: "bodyweight", cue: "Shoulders on a bench, drive hips up." },
  { id: "single-leg-rdl", name: "Single-leg RDL", muscle_group: "hinge", equipment: "bodyweight", cue: "Hinge at hip, flat back, slow eccentric." },
  { id: "good-morning-bw", name: "Bodyweight good morning", muscle_group: "hinge", equipment: "bodyweight", cue: "Hinge from hips, soft knees, chest stays proud." },
  { id: "nordic-curl-banded", name: "Banded nordic curl", muscle_group: "hinge", equipment: "band", cue: "Band assists the lower — lower as slow as you control." },
  { id: "nordic-curl", name: "Nordic curl", muscle_group: "hinge", equipment: "bodyweight", cue: "Anchor ankles, lower under control as far as possible." },
  { id: "db-rdl", name: "Dumbbell RDL", muscle_group: "hinge", equipment: "dumbbell", cue: "Dumbbells close to legs, hinge, flat back." },
  { id: "db-deadlift", name: "Dumbbell deadlift", muscle_group: "hinge", equipment: "dumbbell", cue: "Brace before lifting, drive through heels." },
  { id: "db-swing", name: "Dumbbell swing", muscle_group: "hinge", equipment: "dumbbell", cue: "Hip hinge power, not a squat — arms are just along for the ride." },

  // ---- core: floor -> hanging -> rings ----
  { id: "dead-bug", name: "Dead bug", muscle_group: "core", equipment: "bodyweight", cue: "Low back stays pressed to floor throughout." },
  { id: "hollow-hold-tucked", name: "Hollow hold (tucked)", muscle_group: "core", equipment: "bodyweight", cue: "Knees tucked, low back pressed down — easier lever." },
  { id: "hollow-hold", name: "Hollow body hold", muscle_group: "core", equipment: "bodyweight", cue: "Low back pressed to floor, legs extended." },
  { id: "plank", name: "Plank", muscle_group: "core", equipment: "bodyweight", cue: "Straight line head to heels, ribs down." },
  { id: "plank-shoulder-tap", name: "Plank shoulder taps", muscle_group: "core", equipment: "bodyweight", cue: "Minimize hip rotation with each tap." },
  { id: "side-plank", name: "Side plank", muscle_group: "core", equipment: "bodyweight", cue: "Hips stacked and lifted, don't let them sag." },
  { id: "hanging-knee-raise", name: "Hanging knee raise", muscle_group: "core", equipment: "rings", cue: "Avoid swinging, control the descent." },
  { id: "hanging-leg-raise", name: "Hanging leg raise", muscle_group: "core", equipment: "rings", cue: "Legs straight, raise to at least parallel." },
  { id: "toes-to-rings", name: "Toes to rings", muscle_group: "core", equipment: "rings", cue: "Control the swing, touch feet to the rings with control." },
  { id: "ring-plank", name: "Ring plank", muscle_group: "core", equipment: "rings", cue: "Rings add instability — brace harder than a floor plank." },
  { id: "ring-pike", name: "Ring pike", muscle_group: "core", equipment: "rings", cue: "Feet in rings, pike hips up keeping legs straight." },
  { id: "ring-lsit-tucked", name: "Ring L-sit (tucked)", muscle_group: "core", equipment: "rings", cue: "Knees tucked to chest — easier lever than full L-sit. Rung 2 of the L-sit line." },
  { id: "advanced-tuck-lsit", name: "Advanced tuck L-sit", muscle_group: "core", equipment: "rings", cue: "Knees tucked but hips lifted higher, shins closer to parallel with the floor — more hip-flexor/compression demand than a basic tuck." },
  { id: "one-leg-lsit", name: "One-leg L-sit", muscle_group: "core", equipment: "rings", cue: "One leg extended straight out, the other stays tucked — alternate which leg extends." },
  { id: "ring-lsit", name: "Ring L-sit", muscle_group: "core", equipment: "rings", cue: "Press rings down, legs straight out in front." },
  { id: "assisted-tuck-front-lever", name: "Assisted tuck front lever", muscle_group: "core", equipment: "rings", cue: "Same tuck position as the tuck front lever, but rest your feet on a box or a partner's hands to offload some weight — build the hollow-body lat engagement before taking that support away. Rung 1 of the front lever line." },
  { id: "ring-front-lever-tuck", name: "Tuck front lever", muscle_group: "core", equipment: "rings", cue: "Knees tucked tight, body horizontal, hollow the chest. Rung 2 of the front lever line." },
  { id: "advanced-tuck-front-lever", name: "Advanced tuck front lever", muscle_group: "core", equipment: "rings", cue: "Hips more open than a basic tuck, knees still bent but body more horizontal." },
  { id: "single-leg-front-lever", name: "Single-leg front lever", muscle_group: "core", equipment: "rings", cue: "One leg extended straight, the other tucked — alternate which leg extends." },
  { id: "straddle-front-lever", name: "Straddle front lever", muscle_group: "core", equipment: "rings", cue: "Legs wide and straight, body horizontal — straddle shortens the lever arm versus a full front lever." },
  { id: "full-front-lever", name: "Full front lever", muscle_group: "core", equipment: "rings", cue: "Legs together and straight, body fully horizontal — the end goal of the front lever line." },
  { id: "db-weighted-situp", name: "Weighted sit-up", muscle_group: "core", equipment: "dumbbell", cue: "Hold weight at chest, control the descent." },
  { id: "band-pallof-press", name: "Pallof press", muscle_group: "core", equipment: "band", cue: "Resist rotation — press straight out and back." },

  // ---- ruck ----
  { id: "ruck-walk", name: "Ruck walk", muscle_group: "ruck", equipment: "weighted pack", cue: "Upright posture, steady pace." },
  { id: "ruck-stairs", name: "Ruck stairs", muscle_group: "ruck", equipment: "weighted pack", cue: "Controlled pace, drive through the whole foot." },
  { id: "ruck-lunges", name: "Ruck walking lunges", muscle_group: "ruck", equipment: "weighted pack", cue: "Pack adds load — keep the same lunge form as unweighted." },
  { id: "weighted-vest-carry", name: "Weighted vest carry", muscle_group: "ruck", equipment: "weighted vest", cue: "Steady breathing, tall posture." },
  { id: "db-farmer-carry", name: "Farmer carry", muscle_group: "ruck", equipment: "dumbbell", cue: "Shoulders back, don't let the weight pull you forward." },
  { id: "db-suitcase-carry", name: "Suitcase carry", muscle_group: "ruck", equipment: "dumbbell", cue: "Resist leaning away from the loaded side." },

  // ---- push: dip line + planche line (gaps found vs r/bodyweightfitness RR + Fitloop) ----
  { id: "ring-support-hold", name: "Ring support hold", muscle_group: "push", equipment: "rings", cue: "Arms locked, shoulders depressed away from ears." },
  { id: "bench-dip", name: "Bench dip", muscle_group: "push", equipment: "bodyweight", cue: "Elbows track back, don't flare, lower under control." },
  { id: "ring-negative-dip", name: "Ring negative dip", muscle_group: "push", equipment: "rings", cue: "Jump or step to the top, lower for a slow 4-5 count." },
  // parallel-bar-dip removed — same movement as ring-dip above, just on a
  // fixed bar instead of rings; merged into ring-dip rather than kept as a
  // separate equipment: "bar or rings" duplicate.
  { id: "frog-stand", name: "Frog stand (crow pose)", muscle_group: "push", equipment: "bodyweight", cue: "Hands flat, knees resting on the backs of your upper arms, lean forward until your feet lift — low to the ground and easy to bail out of. Rung 1 of the planche line, teaches the forward lean and wrist loading before the planche lean adds a full lockout." },
  { id: "planche-lean", name: "Planche lean", muscle_group: "push", equipment: "bodyweight", cue: "Hands by hips, shift shoulders past hands, keep arms locked — rung 2 of the planche line." },
  { id: "tuck-planche", name: "Tuck planche", muscle_group: "push", equipment: "bodyweight", cue: "Knees tucked tight to chest, feet off floor, hips level with shoulders." },
  { id: "advanced-tuck-planche", name: "Advanced tuck planche", muscle_group: "push", equipment: "bodyweight", cue: "Hips raised higher than a basic tuck, knees still in but body more horizontal, shoulders further past the hands." },
  { id: "straddle-planche", name: "Straddle planche", muscle_group: "push", equipment: "bodyweight", cue: "Legs wide and straight, body horizontal — the wide straddle shortens the lever arm versus a full planche." },
  { id: "full-planche", name: "Full planche", muscle_group: "push", equipment: "bodyweight", cue: "Legs together and straight, fully horizontal, arms locked — the end goal of the planche line, often takes years." },

  // ---- pull: row variety, muscle-up line, back lever ----
  { id: "archer-row", name: "Archer row", muscle_group: "pull", equipment: "rings", cue: "Pull toward one hand, other arm stays long and straight." },
  { id: "assisted-german-hang", name: "Assisted German hang", muscle_group: "pull", equipment: "rings", cue: "Same rotation as the German hang, but keep your feet lightly on a box or chair to control how much weight you load — build the shoulder range before taking your feet off. Rung 1 of the back lever line." },
  { id: "german-hang", name: "German hang", muscle_group: "pull", equipment: "rings", cue: "From a hang, rotate the shoulders through until arms are overhead and the body hangs below — deep shoulder stretch, go slow, back off if it pinches. Rung 2 of the back lever line." },
  { id: "skin-the-cat", name: "Skin the cat", muscle_group: "pull", equipment: "rings", cue: "From a German hang, roll back up and over to support, slow and controlled through the shoulders, stop if it pinches." },
  { id: "explosive-high-pullup", name: "Explosive high pull-up", muscle_group: "pull", equipment: "rings", cue: "Pull as explosively as you can, aiming to get your chest or lower sternum up to the rings — the pulling power the muscle-up transition needs. Rung 1 of the muscle-up line." },
  { id: "muscle-up-negative", name: "Muscle-up negative", muscle_group: "pull", equipment: "rings", cue: "Start at the top, lower through the transition as slowly as possible. Rung 2 of the muscle-up line." },
  { id: "muscle-up", name: "Muscle-up", muscle_group: "pull", equipment: "rings", cue: "Pull high and fast, roll over the transition, avoid kipping early on." },
  { id: "tuck-back-lever", name: "Tuck back lever", muscle_group: "pull", equipment: "rings", cue: "Knees tucked, body inverted and horizontal, control the entry and exit." },
  { id: "straddle-back-lever", name: "Straddle back lever", muscle_group: "pull", equipment: "rings", cue: "Legs wide and straight, body inverted and horizontal — straddle shortens the lever arm versus a full back lever." },
  { id: "full-back-lever", name: "Full back lever", muscle_group: "pull", equipment: "rings", cue: "Legs together and straight, body fully horizontal and inverted — the end goal of the back lever line." },

  // ---- legs: calf work was missing entirely, plus cossack squat ----
  { id: "calf-raise", name: "Calf raise", muscle_group: "legs", equipment: "bodyweight", cue: "Full range, pause at the top, control the descent." },
  { id: "cossack-squat", name: "Cossack squat", muscle_group: "legs", equipment: "bodyweight", cue: "Shift weight fully to one side, other leg stays straight." },
  { id: "single-leg-calf-raise", name: "Single-leg calf raise", muscle_group: "legs", equipment: "bodyweight", cue: "Use a wall for balance only, not assistance." },

  // ---- core: more skill-line variety ----
  { id: "supine-heel-taps", name: "Supine heel taps", muscle_group: "core", equipment: "bodyweight", cue: "On your back, knees at 90°, low back pressed down; lower one heel to tap the floor, then switch. Slow and quiet." },
  { id: "plank-reach-out", name: "Plank reach-out", muscle_group: "core", equipment: "bodyweight", cue: "Forearm or high plank, hips level; reach one arm long in front, hold a beat, switch. No sagging." },
  { id: "superman", name: "Superman", muscle_group: "core", equipment: "bodyweight", cue: "Lift chest and legs together, squeeze glutes, don't yank the neck." },
  { id: "reverse-plank", name: "Reverse plank", muscle_group: "core", equipment: "bodyweight", cue: "Hips up, squeeze glutes, fingers pointed toward feet." },
  { id: "copenhagen-plank", name: "Copenhagen plank", muscle_group: "core", equipment: "bodyweight", cue: "Top foot on a bench/couch edge, hips lifted and level." },
  { id: "windshield-wipers", name: "Windshield wipers", muscle_group: "core", equipment: "bodyweight", cue: "Control the rotation both ways, shoulders stay flat." },
  { id: "ring-ab-rollout", name: "Ring ab rollout", muscle_group: "core", equipment: "rings", cue: "Hollow position throughout, don't let the hips sag." },
  { id: "dragon-flag", name: "Dragon flag", muscle_group: "core", equipment: "bodyweight", cue: "Only shoulders touch the bench, body stays a rigid straight line." },

  // ---- push: more skill/explosive variety ----
  { id: "elbow-lever", name: "Elbow lever", muscle_group: "core", equipment: "bodyweight", cue: "Elbows tucked into hip crease, lean forward until feet lift." },
  { id: "plyo-pushup", name: "Plyo push-up", muscle_group: "push", equipment: "bodyweight", cue: "Explode hands off the floor, land soft with bent elbows." },
  { id: "clapping-pushup", name: "Clapping push-up", muscle_group: "push", equipment: "bodyweight", cue: "Full extension before the clap, absorb the landing." },
  { id: "one-arm-pushup", name: "One-arm push-up", muscle_group: "push", equipment: "bodyweight", cue: "Feet wide for a base, resist rotating the torso." },
  { id: "handstand-walk", name: "Handstand walk", muscle_group: "push", equipment: "bodyweight", cue: "Small steps, look at the floor, ribs stacked over hips." },

  // ---- pull: one-arm pull-up line ----
  // (the human flag line was removed — it needs a fixed vertical pole,
  // which isn't equipment this person has or trains with)
  { id: "one-arm-pullup-negative", name: "One-arm pull-up negative", muscle_group: "pull", equipment: "rings", cue: "Assist up with the other hand, lower on one arm as slow as possible." },
  { id: "one-arm-pullup", name: "One-arm pull-up", muscle_group: "pull", equipment: "rings", cue: "Start dead hang, avoid swinging into the pull." },

  // ---- legs & core: dynamic/explosive for variety in short sessions ----
  { id: "broad-jump", name: "Broad jump", muscle_group: "legs", equipment: "bodyweight", cue: "Swing arms for momentum, land soft and stick it." },
  { id: "jumping-lunge", name: "Jumping lunge", muscle_group: "legs", equipment: "bodyweight", cue: "Switch legs mid-air, land with control each side." },
  { id: "burpee", name: "Burpee", muscle_group: "legs", equipment: "bodyweight", cue: "Chest to floor, explosive jump up, steady pace beats sloppy speed." },
  { id: "mountain-climbers", name: "Mountain climbers", muscle_group: "core", equipment: "bodyweight", cue: "Hips stay low and level, drive knees in with control." },
  { id: "bear-crawl", name: "Bear crawl", muscle_group: "core", equipment: "bodyweight", cue: "Knees hover just off the floor, opposite hand/foot move together." },
  { id: "inchworm", name: "Inchworm", muscle_group: "core", equipment: "bodyweight", cue: "Walk hands out to a plank, walk feet up to hands, keep legs as straight as you can." },

  // ---- hinge: bridge progression — a well-established category we had zero coverage of ----
  { id: "wall-bridge", name: "Wall bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "Walk hands down the wall toward the floor, breathe normally throughout." },
  { id: "wheel-bridge", name: "Wheel bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "Push through palms and feet, aim for an even upside-down U shape." },
  { id: "full-bridge", name: "Full bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "From standing, lean back with control until both palms touch down." },
  { id: "stand-to-stand-bridge", name: "Stand-to-stand bridge", muscle_group: "hinge", equipment: "bodyweight", cue: "Only attempt once full bridges are solid — lean back to a bridge, then push back up to standing." },

  // ---- core: rotational work ----
  { id: "standing-twist", name: "Standing twist", muscle_group: "core", equipment: "bodyweight", cue: "Rotate from the torso, keep hips facing forward." },

  // ---- pull: ring skill ----
  { id: "ring-pullover", name: "Ring pullover", muscle_group: "pull", equipment: "rings", cue: "From a hang, pull and rotate up into a support position — go slow." },

  // ---- mobility/prehab/rehab: a real category we had zero of, wired into
  // warmup/cooldown selection below. Not part of the strength progression
  // system (no muscle-group levels) since flexibility isn't tracked the
  // same way as calisthenics skill difficulty.
  { id: "arm-circles", name: "Arm circles", muscle_group: "mobility", equipment: "bodyweight", cue: "Small to large circles, both directions." },
  { id: "shoulder-dislocates-band", name: "Shoulder dislocates", muscle_group: "mobility", equipment: "band", cue: "Wide grip, straight arms, pass the band over and back slowly." },
  { id: "wall-slides", name: "Wall slides", muscle_group: "mobility", equipment: "bodyweight", cue: "Back flat against wall, slide arms up keeping contact throughout." },
  { id: "scapular-wall-pushup", name: "Scapular wall push-up", muscle_group: "mobility", equipment: "bodyweight", cue: "Arms straight against wall, protract and retract shoulder blades only." },
  { id: "doorway-chest-stretch", name: "Doorway chest stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Forearm on the frame, gently lean through until you feel the stretch." },
  { id: "thread-the-needle", name: "Thread the needle", muscle_group: "mobility", equipment: "bodyweight", cue: "From all fours, thread one arm under the other, rotate through the upper back." },
  { id: "wrist-circles", name: "Wrist circles", muscle_group: "mobility", equipment: "bodyweight", cue: "Both directions, then shake out." },
  { id: "wrist-flexor-stretch", name: "Wrist flexor/extensor stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Straighten the arm, gently pull fingers back, then the reverse." },
  { id: "childs-pose-reach", name: "Child's pose reach", muscle_group: "mobility", equipment: "bodyweight", cue: "Hips back to heels, walk hands out, sink the chest." },
  { id: "cat-cow", name: "Cat-cow", muscle_group: "mobility", equipment: "bodyweight", cue: "Arch and round the spine slowly, following the breath." },
  { id: "hip-90-90-stretch", name: "90/90 hip stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Both legs bent at 90°, lean forward over the front shin." },
  { id: "worlds-greatest-stretch", name: "World's greatest stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Lunge, rotate toward the front leg, reach up — full body dynamic stretch." },
  { id: "kneeling-hip-flexor-stretch", name: "Kneeling hip flexor stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Back knee down, squeeze the glute, shift weight forward gently." },
  { id: "ankle-circles", name: "Ankle circles", muscle_group: "mobility", equipment: "bodyweight", cue: "Both directions each foot, then point and flex." },
  { id: "wall-ankle-mobilization", name: "Wall ankle mobilization", muscle_group: "mobility", equipment: "bodyweight", cue: "Knee toward the wall without heel lifting, rock gently." },
  { id: "deep-squat-hold", name: "Deep squat hold", muscle_group: "mobility", equipment: "bodyweight", cue: "Heels down, chest up, elbows can press knees out gently." },
  { id: "pigeon-pose", name: "Pigeon pose", muscle_group: "mobility", equipment: "bodyweight", cue: "Front shin angled, hips square to the floor, fold forward." },
  { id: "standing-hamstring-stretch", name: "Standing hamstring stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Soft knee, hinge from the hips, let the head hang." },

  // ---- round 2: neck (desk job relevance), dedicated rotator cuff prehab
  // (distinct from general shoulder mobility — this is injury prevention
  // specifically for ring work), and lower-body stretches missed above ----
  { id: "neck-circles", name: "Neck circles", muscle_group: "mobility", equipment: "bodyweight", cue: "Slow and controlled, both directions, stop if anything pinches." },
  { id: "chin-tucks", name: "Chin tucks", muscle_group: "mobility", equipment: "bodyweight", cue: "Draw the chin straight back like making a double chin, hold briefly." },
  { id: "neck-lateral-stretch", name: "Neck lateral stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Ear toward shoulder, light hand pressure only, never force it." },
  { id: "prone-ytw-raise", name: "Prone Y-T-W raise", muscle_group: "mobility", equipment: "bodyweight", cue: "Face down, lift arms in a Y, then T, then W — thumbs up, squeeze the shoulder blades." },
  { id: "band-external-rotation", name: "Band external rotation", muscle_group: "mobility", equipment: "band", cue: "Elbow pinned to your side at 90°, rotate the forearm out slowly." },
  { id: "wall-angels", name: "Wall angels", muscle_group: "mobility", equipment: "bodyweight", cue: "Back and arms stay in contact with the wall as you slide up and down." },
  { id: "standing-quad-stretch", name: "Standing quad stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Heel to glute, knees together, hold something for balance if needed." },
  { id: "wall-calf-stretch", name: "Wall calf stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Back leg straight, heel down, lean into the wall." },
  { id: "figure-4-glute-stretch", name: "Figure-4 glute stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Lying down, ankle crosses opposite knee, pull the thigh in gently." },
  { id: "butterfly-stretch", name: "Butterfly stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Soles together, knees out, let gravity do the work — no bouncing." },
  { id: "side-lunge-stretch", name: "Side lunge stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Sink into one side, other leg stays straight, feel the inner thigh." },
  { id: "bird-dog", name: "Bird dog", muscle_group: "mobility", equipment: "bodyweight", cue: "Opposite arm and leg extend together, hips stay level, brief hold each side." },
  { id: "thoracic-extension-chair", name: "Thoracic extension over a chair", muscle_group: "mobility", equipment: "bodyweight", cue: "Upper back over the chair edge, hands behind head, extend gently." },

  // ---- more mobility variety, added so the warmup/cool-down picks don't
  // feel like the same handful on repeat ----
  { id: "jumping-jacks", name: "Jumping jacks", muscle_group: "mobility", equipment: "bodyweight", cue: "Easy pace, just raising heart rate and body temp — not for speed." },
  { id: "high-knees", name: "High knees", muscle_group: "mobility", equipment: "bodyweight", cue: "Quick, light steps, drive knees to about hip height." },
  { id: "leg-swings-front", name: "Leg swings (front-to-back)", muscle_group: "mobility", equipment: "bodyweight", cue: "Hold something for balance, swing from the hip, let range build gradually." },
  { id: "leg-swings-side", name: "Leg swings (side-to-side)", muscle_group: "mobility", equipment: "bodyweight", cue: "Hold something for balance, swing across the body and back, stay tall." },
  { id: "calf-raises-dynamic", name: "Calf raises (dynamic)", muscle_group: "mobility", equipment: "bodyweight", cue: "Rise onto toes and lower with control, full range each rep." },
  { id: "scorpion-stretch", name: "Scorpion stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Face down, reach one foot across and up toward the opposite hand, alternate sides." },
  { id: "seated-spinal-twist", name: "Seated spinal twist", muscle_group: "mobility", equipment: "bodyweight", cue: "Sit tall, rotate from the ribcage, both sides, hands light on the floor or knee." },
  { id: "band-overhead-stretch", name: "Band overhead stretch", muscle_group: "mobility", equipment: "band", cue: "Hold the band wide overhead, gently reach back and down to open the shoulders." },

  // ---- shoulder-balance set: for uneven shoulder height / one-sided tightness.
  // All bodyweight, all done on BOTH sides (give the lower/weaker side an
  // extra round). Warm-ups are the dynamic ones, cool-downs the holds. ----
  { id: "open-book-rotation", name: "Side-lying open book", muscle_group: "mobility", equipment: "bodyweight", cue: "On your side, knees stacked, open the top arm back toward the floor behind you following it with your eyes. Both sides, an extra round on the tighter one." },
  { id: "scapular-shrug-depress", name: "Scapular shrugs and presses down", muscle_group: "mobility", equipment: "bodyweight", cue: "Arms at your sides, shrug the shoulders up, then press them down away from the ears. Slow, watch for one side moving less." },
  { id: "scapular-pushup-floor", name: "Scapular push-up", muscle_group: "mobility", equipment: "bodyweight", cue: "In a plank with straight arms, let the chest sink between the shoulder blades, then push the floor away and round the upper back. Arms stay straight." },
  { id: "cross-body-shoulder-stretch", name: "Cross-body shoulder stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Pull one arm across the chest with the other hand, shoulders level. Both sides, hold each." },
  { id: "levator-scapulae-stretch", name: "Levator scapulae stretch", muscle_group: "mobility", equipment: "bodyweight", cue: "Turn the nose toward one armpit, let the head's weight (or a light hand) tip it down, opposite shoulder stays low. Both sides, easy pressure only." },

  // ---- from the Kavadlo brothers' (Al & Danny) well-documented progressions —
  // real gaps confirmed against their published exercise lists ----
  // (archer push-up/pull-up and toes to bar already exist above — those three
  // were duplicated here with slightly different cue wording; removed rather
  // than kept, since a duplicate id caused double rows in the Exercise
  // Library and a conflicting level for toes-to-bar in EXERCISE_LEVEL_MAP)
  { id: "archer-squat", name: "Archer squat", muscle_group: "legs", equipment: "bodyweight", cue: "Shift weight to one leg, the other extends straight out to the side." },
  { id: "hover-lunge", name: "Hover lunge", muscle_group: "legs", equipment: "bodyweight", cue: "Pause just above the floor at the bottom of the lunge before driving back up." },
  { id: "l-sit-pullup", name: "L-sit pull-up", muscle_group: "pull", equipment: "rings", cue: "Hold the L-sit position throughout the entire pull, don't let the legs drop." },
  { id: "l-sit-archer-pullup", name: "L-sit archer pull-up", muscle_group: "pull", equipment: "rings", cue: "Archer pull-up while maintaining the L-sit the whole way — very advanced." },

  // ---- parallettes: push/core, same lines as bar/rings but handles close to
  // the floor — easier on the wrists for push-up/handstand/L-sit work ----
  { id: "parallette-pushup", name: "Parallette push-up", muscle_group: "push", equipment: "parallettes", cue: "Deeper range than a floor push-up — lower until shoulders dip below hand height." },
  { id: "parallette-pseudo-planche-pushup", name: "Parallette pseudo planche push-up", muscle_group: "push", equipment: "parallettes", cue: "Lean shoulders well past the handles, elbows locked." },
  { id: "parallette-dip", name: "Parallette dip", muscle_group: "push", equipment: "parallettes", cue: "Lower under control, elbows track back, don't flare." },
  { id: "parallette-handstand-hold", name: "Parallette handstand hold", muscle_group: "push", equipment: "parallettes", cue: "Wrists stay neutral on the handles — easier on the joints than a floor handstand." },
  { id: "parallette-support-hold", name: "Parallette support hold", muscle_group: "core", equipment: "parallettes", cue: "Straight arms, shoulders depressed, hold full-body support with feet off the ground — no leg lift yet. Rung 1 of the L-sit line, pure straight-arm strength before adding hip flexion." },
  { id: "parallette-l-sit-tucked", name: "Parallette L-sit (tucked)", muscle_group: "core", equipment: "parallettes", cue: "Knees tucked to chest, push down through straight arms. Rung 2 of the L-sit line." },
  { id: "parallette-l-sit", name: "Parallette L-sit", muscle_group: "core", equipment: "parallettes", cue: "Legs straight out in front, shoulders depressed, hold." },
  { id: "parallette-shoulder-tap", name: "Parallette plank shoulder taps", muscle_group: "core", equipment: "parallettes", cue: "Hands on the handles, minimize hip rotation with each tap." },
  { id: "parallette-l-sit-compression", name: "Parallette L-sit compression", muscle_group: "core", equipment: "parallettes", cue: "Pull chest toward thighs in the L-sit — advanced hip-flexor/core compression." },

  // ---- ab wheel: core ----
  { id: "ab-wheel-rollout-kneeling", name: "Ab wheel rollout (kneeling)", muscle_group: "core", equipment: "ab wheel", cue: "Hollow position throughout — roll out only as far as you can keep your back flat." },
  { id: "ab-wheel-rollout-standing", name: "Ab wheel rollout (standing)", muscle_group: "core", equipment: "ab wheel", cue: "Very advanced — brace hard, roll out from standing without the hips sagging or the back rounding." },

  // ---- kettlebell (one bell): used by the built-in Kettlebell program. These
  // progress by bell weight and reps, NOT by the bodyweight level system, so
  // results on them never move your push/pull/legs/hinge/core levels
  // (see isBellExercise in applyWorkoutResults). Travel mode hides them. ----
  { id: "kb-swing", name: "Kettlebell swing", muscle_group: "hinge", equipment: "kettlebell", cue: "Bell on the floor a foot in front of you. Hike it back between your legs like a football snap, then snap your hips forward to float it to chest height. Arms are just hooks, the hips do the work. Flat back, stand tall and squeeze glutes at the top, don't squat it." },
  { id: "kb-swing-1h", name: "One-hand kettlebell swing", muscle_group: "hinge", equipment: "kettlebell", cue: "Same hinge as the two-hand swing, one hand on the handle and the free arm out for balance. Keep your shoulders square so the bell doesn't twist you. Switch hands every set (or every few reps)." },
  { id: "kb-goblet-squat", name: "Kettlebell goblet squat", muscle_group: "legs", equipment: "kettlebell", cue: "Hold the bell at your chest by the horns, elbows pointing down. Sit down between your knees with your chest tall, elbows brushing the inside of your knees at the bottom, then drive up." },
  { id: "kb-rack-reverse-lunge", name: "Kettlebell rack reverse lunge", muscle_group: "legs", equipment: "kettlebell", cue: "Bell racked at one shoulder, elbow tucked. Step back into a lunge, back knee close to the floor and torso tall, drive through the front heel to stand. Do all reps on one side, then switch." },
  { id: "kb-press-hk", name: "Kettlebell half-kneeling press", muscle_group: "push", equipment: "kettlebell", cue: "Kneel on the knee opposite the pressing arm, bell racked at the shoulder with the forearm vertical. Squeeze the glute of the kneeling leg and press straight up until your bicep is by your ear, then lower under control. Ribs down, don't lean back." },
  { id: "kb-floor-press", name: "Kettlebell floor press", muscle_group: "push", equipment: "kettlebell", cue: "Lie on your back, knees bent, bell in one hand with the upper arm about 45 degrees from your body. Press straight up, lower until the back of your upper arm touches the floor, pause, press." },
  { id: "kb-row", name: "Kettlebell bent-over row", muscle_group: "pull", equipment: "kettlebell", cue: "Hinge to a flat back with your free hand on your knee or a bench. Row the bell to your hip, elbow close to your ribs, squeeze the shoulder blade, lower slowly." },
  { id: "kb-clean", name: "Kettlebell clean to rack", muscle_group: "pull", equipment: "kettlebell", cue: "Start like a one-hand swing. As the bell comes up, pull your elbow in tight and let the bell rotate around your hand to land softly in the rack at your shoulder, not slam your wrist. Learn it as a hinge then a pull; start light." },
  { id: "kb-row-2h", name: "Kettlebell two-handed row", muscle_group: "pull", equipment: "kettlebell", cue: "Hold the bell by the horns with both hands, hinge to a flat back with the bell hanging below your chest. Row it to your lower ribs, elbows close, squeeze your shoulder blades, lower slowly. Both arms work together, so no sides to switch." },
  { id: "kb-sl-rdl", name: "Kettlebell single-leg Romanian deadlift", muscle_group: "hinge", equipment: "kettlebell", cue: "Bell in the hand opposite your standing leg. Soft knee, hinge forward as the other leg reaches straight back, flat back and square hips. Squeeze the glute of the standing leg to come up." },
  { id: "kb-suitcase-carry", name: "Kettlebell suitcase carry", muscle_group: "core", equipment: "kettlebell", cue: "Hold the bell at your side like a suitcase and walk tall. Don't lean toward the bell; keep your shoulders level and ribs stacked. Switch hands halfway through the time." },
  { id: "kb-waiter-carry", name: "Waiter carry", muscle_group: "core", equipment: "kettlebell", cue: "Bell pressed overhead in one hand with wrist over elbow over shoulder. Walk slowly with ribs down and the shoulder packed. Switch hands halfway. If it drifts, bring it to the rack and finish there." },
  { id: "kb-overhead-lunge", name: "Kettlebell overhead reverse lunge", muscle_group: "core", equipment: "kettlebell", cue: "Press the bell overhead with one arm, bicep by your ear and ribs down. Step back into a lunge, torso tall, eyes forward, then drive through the front heel to stand. All reps one side, then switch. Too heavy overhead? Hold it racked at the shoulder instead." },
  { id: "kb-halo", name: "Kettlebell halo", muscle_group: "core", equipment: "kettlebell", cue: "Hold the bell upside down by the horns at your chest. Circle it around your head, close to your neck, ribs down and hips tight. Do all reps one direction, then the other." },
  { id: "kb-figure8", name: "Kettlebell figure-8", muscle_group: "core", equipment: "kettlebell", cue: "Feet wide, hinge slightly. Pass the bell around one leg, hand it to the other hand between your legs, then around the other leg in a figure-8. Keep your chest up and switch direction halfway." },
  { id: "kb-turkish-getup", name: "Turkish get-up", muscle_group: "core", equipment: "kettlebell", cue: "Lie on your back with the bell pressed up, same-side knee bent. Roll to your elbow, then your hand, lift the hips, sweep the leg back to a kneel, stand. Reverse every step. Eyes on the bell. Learn it with a light object first (even a shoe on your fist)." },
  { id: "kb-deadlift", name: "Kettlebell deadlift", muscle_group: "hinge", equipment: "kettlebell", cue: "Bell on the floor between your feet, just behind the line of your toes. Hinge back with hips high and a flat back, grip the handle with both hands, push the floor away and stand tall, squeezing your glutes. Lower by sending the hips back first. This is the foundation for the swing." },
  { id: "kb-dead-high-pull", name: "Kettlebell dead high pull", muscle_group: "pull", equipment: "kettlebell", cue: "Bell on the floor. Hinge and grab it with one hand, drive the hips forward and pull the elbow up high and wide so the bell rises to chest height. Lower it to the floor and reset every rep. The hips do the work, not the arm. An easier way to learn the clean." },
  { id: "kb-dead-snatch", name: "Kettlebell dead snatch", muscle_group: "pull", equipment: "kettlebell", cue: "Bell on the floor. Hinge and grab it, stand explosively, and as it rises pull it close to your body and punch your hand through to lock it overhead. Lower it to the rack, then back to the floor. Learn this before the swinging snatch." },
  { id: "kb-snatch", name: "Kettlebell snatch", muscle_group: "pull", equipment: "kettlebell", cue: "A swing that finishes overhead in one motion. Hinge, swing back, drive the hips, keep the bell close as it rises, then punch through to a locked arm overhead. Lower it back down the same path. Learn the dead snatch first." },
  { id: "kb-windmill", name: "Kettlebell windmill", muscle_group: "core", equipment: "kettlebell", cue: "Feet a little wider than your shoulders, turned slightly away from the bell side, arm locked overhead. Keep your eyes on the bell, push the hip out toward the bell side and hinge forward, sliding the free hand down the inside of the leg. Stand back up the same way. Start with no weight or a very light bell." },
  { id: "kb-racked-squat", name: "Kettlebell racked squat", muscle_group: "legs", equipment: "kettlebell", cue: "One bell racked at your shoulder with the elbow tucked against your ribs. Squat deep with an upright torso, then stand. Switch sides each set. Harder than a goblet squat because the load is on one side." },
  { id: "kb-complex", name: "Kettlebell complex", muscle_group: "hinge", equipment: "kettlebell", cue: "One round = 3 deadlifts, then 3 cleans, 3 presses and 3 racked squats, all with one hand on the bell and without putting it down. Switch arms each round. Start a new round every minute and rest in whatever time is left. Choose a bell you can press for 3 clean reps." },
  { id: "bw-complex", name: "Bodyweight complex", muscle_group: "legs", equipment: "bodyweight", cue: "One round = 4 good mornings, 4 reverse lunges each side, 4 push-ups and 4 squats, back to back without stopping. Start a new round every minute and rest in whatever time is left. Used as the travel version of the kettlebell complex." },
  { id: "kb-curl", name: "Kettlebell curl", muscle_group: "pull", equipment: "kettlebell", cue: "Hold the handle in one hand with your elbow pinned to your side. Curl the bell to your shoulder, then lower it slowly. Keep your torso still. If 35 lb is too heavy for clean reps, hold the horns with both hands." },
  { id: "kb-overhead-triceps-ext", name: "Kettlebell overhead triceps extension", muscle_group: "push", equipment: "kettlebell", cue: "Hold the handle with both hands and press the bell overhead so it hangs behind your head, elbows pointing forward. Bend the elbows to lower it slowly behind your head, then straighten. Keep ribs down, and use control, not speed." },
  { id: "kb-push-press", name: "Kettlebell push press", muscle_group: "push", equipment: "kettlebell", cue: "From the rack, dip a few inches by bending the knees, then drive the legs and press the bell overhead in one motion. Lower it back to the rack. Lets you move heavier loads overhead than a strict press." },
];

// Approximate difficulty level (1-5) per exercise, based on the progression
// ladder each muscle group was authored as. Used only client-side to group
// the swap picker into regressions/same-level/progressions — not stored in D1.
const EXERCISE_LEVEL_MAP = {
  // kettlebell (one bell) — levels only order the swap picker; these never move your levels
  "kb-swing": 2, "kb-swing-1h": 3, "kb-goblet-squat": 2, "kb-rack-reverse-lunge": 3, "kb-press-hk": 3,
  "kb-floor-press": 2, "kb-row": 2, "kb-row-2h": 2, "kb-clean": 3, "kb-sl-rdl": 3, "kb-suitcase-carry": 2,
  "kb-waiter-carry": 3, "kb-turkish-getup": 3, "kb-overhead-lunge": 3, "kb-halo": 2, "kb-figure8": 2,
  "kb-deadlift": 1, "kb-dead-high-pull": 2, "kb-dead-snatch": 3, "kb-snatch": 4,
  "kb-windmill": 3, "kb-racked-squat": 3, "kb-push-press": 3, "kb-complex": 3, "bw-complex": 2,
  // push
  "wall-pushup": 1, "incline-pushup-high": 1, "incline-pushup": 2, "knee-pushup": 2,
  "pushup": 3, "diamond-pushup": 3, "decline-pushup": 3, "archer-pushup": 4,
  "pseudo-planche-pushup": 4, "one-arm-pushup-assisted": 4, "pike-pushup": 3,
  "decline-pike-pushup": 4, "wall-handstand-hold": 4, "handstand-pushup": 5,
  "ring-pushup-easy": 2, "ring-pushup": 3, "ring-archer-pushup": 4, "ring-typewriter-pushup": 5,
  "ring-dip-supported": 2, "ring-dip": 3, "ring-dip-weighted": 5,
  "db-floor-press": 3, "db-overhead-press": 3,
  // pull
  "dead-hang": 1, "active-hang": 1, "scap-pull": 2, "band-assisted-pullup": 2,
  "negative-pullup": 2, "chinup": 3, "typewriter-pullup": 5, "one-arm-pullup-assisted": 4, "ring-row-easy": 2,
  "ring-row": 3, "ring-row-feet-elevated": 4, "ring-pullup-assisted": 3,
  "ring-pullup": 4, "ring-archer-pullup": 5, "band-pull-apart": 1,
  "db-single-arm-row": 3, "db-renegade-row": 4, "weighted-pullup": 4,
  "towel-pull-apart": 1, "prone-t-raise": 1, "prone-y-raise": 1, "superman-pulldown": 2,
  "reverse-snow-angel": 2, "doorframe-row": 2, "backpack-row": 2, "towel-door-row": 3, "table-row": 3,
  "wall-pushup-feet-back": 1, "pike-pushup-hands-elevated": 2, "staggered-pushup": 3, "tempo-pushup": 3, "hindu-pushup": 3,
  "sit-to-stand": 1, "step-up-low": 1, "reverse-lunge": 2, "step-up-high": 2, "lateral-lunge": 2, "skater-squat": 4,
  "hip-hinge-drill": 1, "prone-leg-raise": 1, "donkey-kick": 1, "glute-bridge-march": 2, "towel-hamstring-curl": 3,
  "single-leg-towel-hamstring-curl": 4,
  "v-up": 4, "hollow-rock": 4, "plank-to-pike": 4, "side-plank-leg-raise": 4, "long-lever-plank": 5,
  // legs
  "wall-sit": 1, "box-squat-high": 2, "bodyweight-squat": 3, "split-squat": 3,
  "bulgarian-split-squat": 4, "shrimp-squat": 5, "ring-assisted-pistol": 2,
  "box-pistol": 4, "pistol-squat": 5, "jump-squat": 3, "db-goblet-squat": 3,
  "db-lunge": 3, "db-step-up": 3, "db-weighted-pistol": 5,
  // hinge
  "glute-bridge": 1, "single-leg-glute-bridge": 2, "hip-thrust-bw": 2,
  "single-leg-rdl": 3, "good-morning-bw": 3, "nordic-curl-banded": 3,
  "nordic-curl": 5, "db-rdl": 3, "db-deadlift": 3, "db-swing": 4,
  // core
  "dead-bug": 1, "hollow-hold-tucked": 2, "hollow-hold": 3, "plank": 3,
  "plank-shoulder-tap": 3, "side-plank": 3, "hanging-knee-raise": 3,
  "hanging-leg-raise": 4, "toes-to-rings": 5, "ring-plank": 3, "ring-pike": 4,
  "ring-lsit-tucked": 3, "ring-lsit": 5, "ring-front-lever-tuck": 5,
  "db-weighted-situp": 3, "band-pallof-press": 2,
  // ruck
  "ruck-walk": 2, "ruck-stairs": 3, "ruck-lunges": 3, "weighted-vest-carry": 2,
  "db-farmer-carry": 3, "db-suitcase-carry": 3,
  // new: dip/planche line
  "ring-support-hold": 1, "bench-dip": 2, "ring-negative-dip": 2,
  "planche-lean": 3, "tuck-planche": 5,
  // new: rows/muscle-up/back lever
  "archer-row": 4, "skin-the-cat": 3, "muscle-up-negative": 4, "muscle-up": 5,
  "tuck-back-lever": 5,
  // new: legs
  "calf-raise": 1, "cossack-squat": 3, "single-leg-calf-raise": 3,
  // new: core
  "superman": 1, "reverse-plank": 2, "copenhagen-plank": 4,
  "windshield-wipers": 4, "ring-ab-rollout": 4, "dragon-flag": 5,
  // new: skill/explosive variety
  "elbow-lever": 4, "plyo-pushup": 4, "clapping-pushup": 4, "one-arm-pushup": 5,
  "handstand-walk": 5,
  "one-arm-pullup-negative": 5, "one-arm-pullup": 5,
  "broad-jump": 3, "jumping-lunge": 4, "burpee": 2,
  "mountain-climbers": 2, "bear-crawl": 2, "inchworm": 1, "supine-heel-taps": 1, "plank-reach-out": 2,
  "wall-bridge": 1, "wheel-bridge": 3, "full-bridge": 4, "stand-to-stand-bridge": 5,
  "standing-twist": 1, "ring-pullover": 4,
  "archer-squat": 3, "hover-lunge": 3, "l-sit-pullup": 4, "l-sit-archer-pullup": 5,
  // new: parallettes + ab wheel
  "parallette-pushup": 3, "parallette-pseudo-planche-pushup": 4, "parallette-dip": 3,
  "parallette-handstand-hold": 4, "parallette-l-sit-tucked": 2, "parallette-l-sit": 4,
  "parallette-shoulder-tap": 3, "parallette-l-sit-compression": 5,
  "ab-wheel-rollout-kneeling": 4, "ab-wheel-rollout-standing": 5,
  // new: skill-ladder rungs (handstand / L-sit / planche / back lever /
  // front lever) — these numbers are just for Library browsing and the
  // manual swap-panel bucketing; actual auto-generation eligibility for
  // these ids goes through SKILL_LADDER_MAP's own rung gate below, not
  // this number, since the whole point is they shouldn't borrow readiness
  // from the general push/pull level.
  "wall-handstand-hold-back": 4, "freestanding-handstand-practice": 4,
  "freestanding-handstand-hold": 5, "handstand-pushup-negative": 5,
  "advanced-tuck-planche": 5, "straddle-planche": 5, "full-planche": 5,
  "german-hang": 3, "straddle-back-lever": 5, "full-back-lever": 5,
  "advanced-tuck-lsit": 3, "one-leg-lsit": 4,
  "advanced-tuck-front-lever": 5, "single-leg-front-lever": 5,
  "straddle-front-lever": 5, "full-front-lever": 5,
  // new: true-beginner rung-1 entries added ahead of each skill line
  "wall-walk-handstand-prep": 1, "parallette-support-hold": 1, "frog-stand": 1,
  "assisted-german-hang": 1, "assisted-tuck-front-lever": 1, "explosive-high-pullup": 1,
};

// Real multi-rung SKILL LADDERS for the gymnastics-strength lines that
// Steven Low's Overcoming Gravity (and the r/bodyweightfitness recommended-
// routine FAQ) treat as genuinely separate progressions, not just "a harder
// rep exercise of the same pattern" — handstand, L-sit, planche, back
// lever, front lever, muscle-up. Each id maps to {skill, rung}: rung 1 is
// the entry point everyone starts at (see state.skillLevels — deliberately
// NOT inherited from general push/pull level, since skill readiness isn't
// the same thing as strength), and a given rung is only offered to the
// auto-generator once state.skillLevels[skill] has reached it — gating on
// actual sustained performance on THIS specific ladder (applyWorkoutResults,
// REQUIRED_SKILL_STREAK), never on how strong the person's push/pull is
// generally. Multiple ids can share a rung (equipment alternates at the
// same real difficulty, e.g. a parallette vs. rings version).
const SKILL_LADDER_MAP = {
  // handstand line
  "wall-walk-handstand-prep": { skill: "handstand", rung: 1 },
  "wall-handstand-hold": { skill: "handstand", rung: 2 },
  "wall-handstand-hold-back": { skill: "handstand", rung: 3 },
  "parallette-handstand-hold": { skill: "handstand", rung: 3 },
  "freestanding-handstand-practice": { skill: "handstand", rung: 4 },
  "freestanding-handstand-hold": { skill: "handstand", rung: 5 },
  "handstand-pushup-negative": { skill: "handstand", rung: 6 },
  "handstand-pushup": { skill: "handstand", rung: 7 },
  "handstand-walk": { skill: "handstand", rung: 8 },
  // L-sit line
  "parallette-support-hold": { skill: "lsit", rung: 1 },
  "parallette-l-sit-tucked": { skill: "lsit", rung: 2 },
  "ring-lsit-tucked": { skill: "lsit", rung: 2 },
  "advanced-tuck-lsit": { skill: "lsit", rung: 3 },
  "one-leg-lsit": { skill: "lsit", rung: 4 },
  "parallette-l-sit": { skill: "lsit", rung: 5 },
  "ring-lsit": { skill: "lsit", rung: 5 },
  "parallette-l-sit-compression": { skill: "lsit", rung: 6 },
  "l-sit-pullup": { skill: "lsit", rung: 6 },
  "l-sit-archer-pullup": { skill: "lsit", rung: 7 },
  // planche line
  "frog-stand": { skill: "planche", rung: 1 },
  "planche-lean": { skill: "planche", rung: 2 },
  "tuck-planche": { skill: "planche", rung: 3 },
  "advanced-tuck-planche": { skill: "planche", rung: 4 },
  "straddle-planche": { skill: "planche", rung: 5 },
  "full-planche": { skill: "planche", rung: 6 },
  // back lever line
  "assisted-german-hang": { skill: "backLever", rung: 1 },
  "german-hang": { skill: "backLever", rung: 2 },
  "skin-the-cat": { skill: "backLever", rung: 3 },
  "tuck-back-lever": { skill: "backLever", rung: 4 },
  "straddle-back-lever": { skill: "backLever", rung: 5 },
  "full-back-lever": { skill: "backLever", rung: 6 },
  // front lever line
  "assisted-tuck-front-lever": { skill: "frontLever", rung: 1 },
  "ring-front-lever-tuck": { skill: "frontLever", rung: 2 },
  "advanced-tuck-front-lever": { skill: "frontLever", rung: 3 },
  "single-leg-front-lever": { skill: "frontLever", rung: 4 },
  "straddle-front-lever": { skill: "frontLever", rung: 5 },
  "full-front-lever": { skill: "frontLever", rung: 6 },
  // muscle-up line
  "explosive-high-pullup": { skill: "muscleUp", rung: 1 },
  "muscle-up-negative": { skill: "muscleUp", rung: 2 },
  "muscle-up": { skill: "muscleUp", rung: 3 },
};
// Highest real rung per skill line, so leveling up never overshoots the
// ladder even if a streak completes past the last-defined rung.
const SKILL_MAX_RUNG = { handstand: 8, lsit: 7, planche: 6, backLever: 6, frontLever: 6, muscleUp: 3 };
const DEFAULT_SKILL_LEVELS = { handstand: 1, lsit: 1, planche: 1, backLever: 1, frontLever: 1, muscleUp: 1 };
const SKILL_DISPLAY_NAMES = { handstand: "Handstand", lsit: "L-sit", planche: "Planche", backLever: "Back lever", frontLever: "Front lever", muscleUp: "Muscle-up" };
const REQUIRED_SKILL_STREAK = 3;

// Shared by applyWorkoutResults (when a skill move happens to land in the
// auto-generated workout) AND the dedicated skill-practice section (ad-hoc
// logging, independent of any workout) — one rule either way. See
// applyWorkoutResults for the full rationale (3-in-a-row, miss resets the
// streak but never regresses the rung).
function applySkillResult(skill, result) {
  state.skillLevels = state.skillLevels || { ...DEFAULT_SKILL_LEVELS };
  state.skillStreaks = state.skillStreaks || {};
  if (result === "missed") {
    state.skillStreaks[skill] = 0;
    return;
  }
  if (result === "max" && !isLosingTooFast()) {
    const streak = (state.skillStreaks[skill] || 0) + 1;
    if (streak >= REQUIRED_SKILL_STREAK) {
      const cap = SKILL_MAX_RUNG[skill] || 5;
      state.skillLevels[skill] = Math.min(cap, (state.skillLevels[skill] || 1) + 1);
      state.skillStreaks[skill] = 0;
    } else {
      state.skillStreaks[skill] = streak;
    }
  }
  // "hold" (partial) result: no-op, same as the general strength rule —
  // doesn't erase progress toward the next rung, doesn't fake-advance it.
}

function levelOf(exerciseIdOrName) {
  // accepts either a library id or falls back to matching by name
  if (EXERCISE_LEVEL_MAP[exerciseIdOrName] !== undefined) return EXERCISE_LEVEL_MAP[exerciseIdOrName];
  const match = exercises.find(x => x.name === exerciseIdOrName || x.id === exerciseIdOrName);
  return match ? (EXERCISE_LEVEL_MAP[match.id] ?? 3) : 3;
}

// Movement-plane classification for push/pull exercises only — "h"
// (horizontal: push-ups/planche-line pressing, rows) vs "v" (vertical:
// overhead/dip pressing, the dead-hang -> pull-up ladder). This is what lets
// the day generator alternate between the two patterns instead of treating
// e.g. a ring row and a dead hang as interchangeable just because they're
// both tagged "pull" at some difficulty number.
const EXERCISE_PLANE_MAP = {
  "kb-press-hk": "v", "kb-floor-press": "h", "kb-row": "h", "kb-row-2h": "h", "kb-clean": "v",
  "kb-push-press": "v", "kb-dead-high-pull": "h", "kb-dead-snatch": "v", "kb-snatch": "v",
  // push - horizontal (push-up/planche line, presses away from the ground)
  "wall-pushup": "h", "incline-pushup-high": "h", "incline-pushup": "h", "knee-pushup": "h",
  "pushup": "h", "diamond-pushup": "h", "decline-pushup": "h", "archer-pushup": "h",
  "pseudo-planche-pushup": "h", "one-arm-pushup-assisted": "h", "ring-pushup-easy": "h",
  "ring-pushup": "h", "ring-archer-pushup": "h", "ring-typewriter-pushup": "h",
  "db-floor-press": "h", "planche-lean": "h", "tuck-planche": "h",
  "advanced-tuck-planche": "h", "straddle-planche": "h", "full-planche": "h",
  "plyo-pushup": "h", "clapping-pushup": "h", "one-arm-pushup": "h", "elbow-lever": "h",
  "frog-stand": "h",
  // push - vertical (overhead press / dip line, presses along the body's long axis)
  "pike-pushup": "v", "decline-pike-pushup": "v", "wall-handstand-hold": "v", "handstand-pushup": "v",
  "wall-walk-handstand-prep": "v",
  "wall-handstand-hold-back": "v", "freestanding-handstand-practice": "v",
  "freestanding-handstand-hold": "v", "handstand-pushup-negative": "v",
  "ring-dip-supported": "v", "ring-dip": "v", "ring-dip-weighted": "v", "db-overhead-press": "v",
  "ring-support-hold": "v", "bench-dip": "v", "ring-negative-dip": "v",
  "handstand-walk": "v",
  // pull - horizontal (rows)
  "ring-row-easy": "h", "ring-row": "h", "ring-row-feet-elevated": "h",
  "band-pull-apart": "h", "db-single-arm-row": "h", "db-renegade-row": "h", "archer-row": "h",
  "towel-pull-apart": "h", "prone-t-raise": "h", "doorframe-row": "h", "backpack-row": "h",
  "towel-door-row": "h", "table-row": "h",
  "prone-y-raise": "v", "superman-pulldown": "v", "reverse-snow-angel": "v",
  "wall-pushup-feet-back": "h", "staggered-pushup": "h", "tempo-pushup": "h",
  "pike-pushup-hands-elevated": "v", "hindu-pushup": "v",
  "tuck-back-lever": "h", "ring-pullover": "h", "german-hang": "h", "assisted-german-hang": "h",
  "straddle-back-lever": "h", "full-back-lever": "h",
  // pull - vertical (the actual pull-up ladder)
  "dead-hang": "v", "active-hang": "v", "scap-pull": "v", "band-assisted-pullup": "v",
  "negative-pullup": "v", "chinup": "v",
  "typewriter-pullup": "v", "one-arm-pullup-assisted": "v", "ring-pullup-assisted": "v",
  "ring-pullup": "v", "ring-archer-pullup": "v", "weighted-pullup": "v", "skin-the-cat": "v",
  "explosive-high-pullup": "v",
  "muscle-up-negative": "v", "muscle-up": "v", "one-arm-pullup-negative": "v", "one-arm-pullup": "v",
  "l-sit-pullup": "v", "l-sit-archer-pullup": "v",
  // push - parallettes (pushup/planche line is horizontal, dip/handstand line is vertical)
  "parallette-pushup": "h", "parallette-pseudo-planche-pushup": "h",
  "parallette-dip": "v", "parallette-handstand-hold": "v",
};

// Defaults for any push/pull exercise not explicitly classified above (e.g.
// a future addition): horizontal push and vertical pull are each the more
// classic/common version of their group, so that's the safer fallback.
function planeOf(exerciseIdOrName, muscleGroup) {
  if (EXERCISE_PLANE_MAP[exerciseIdOrName] !== undefined) return EXERCISE_PLANE_MAP[exerciseIdOrName];
  const match = exercises.find(x => x.name === exerciseIdOrName || x.id === exerciseIdOrName);
  if (match && EXERCISE_PLANE_MAP[match.id] !== undefined) return EXERCISE_PLANE_MAP[match.id];
  const mg = muscleGroup || match?.muscle_group;
  return mg === "pull" ? "v" : "h";
}

// Static holds — their "reps" field represents seconds to hold, not a rep count.
const HOLD_EXERCISE_IDS = new Set([
  "kb-suitcase-carry", "kb-waiter-carry",
  "wall-sit", "dead-hang", "active-hang", "wall-handstand-hold", "plank", "side-plank",
  "ring-plank", "ring-lsit-tucked", "ring-lsit", "ring-front-lever-tuck",
  "hollow-hold-tucked", "hollow-hold",
  "ring-support-hold", "planche-lean", "tuck-planche", "tuck-back-lever",
  "reverse-plank", "copenhagen-plank", "elbow-lever", "long-lever-plank",
  // new skill-ladder rungs that are also static holds (the negative/practice
  // rungs — handstand-pushup-negative, freestanding-handstand-practice —
  // are reps, not holds, so they're deliberately left out of this set)
  "wall-handstand-hold-back", "freestanding-handstand-hold", "german-hang",
  "straddle-back-lever", "full-back-lever", "advanced-tuck-planche",
  "straddle-planche", "full-planche", "advanced-tuck-lsit", "one-leg-lsit",
  "advanced-tuck-front-lever", "single-leg-front-lever",
  "straddle-front-lever", "full-front-lever",
  "wheel-bridge", "full-bridge",
  "doorway-chest-stretch", "wrist-flexor-stretch", "childs-pose-reach",
  "hip-90-90-stretch", "kneeling-hip-flexor-stretch", "deep-squat-hold",
  "pigeon-pose", "standing-hamstring-stretch",
  "neck-lateral-stretch", "standing-quad-stretch", "wall-calf-stretch",
  "figure-4-glute-stretch", "butterfly-stretch", "side-lunge-stretch",
  "thoracic-extension-chair", "seated-spinal-twist", "band-overhead-stretch",
  "cross-body-shoulder-stretch", "levator-scapulae-stretch",
  "parallette-handstand-hold", "parallette-l-sit-tucked", "parallette-l-sit",
  "parallette-l-sit-compression",
  // new true-beginner rung-1 holds (wall-walk-handstand-prep and
  // explosive-high-pullup are reps/attempts-based, left out on purpose)
  "parallette-support-hold", "frog-stand", "assisted-german-hang",
  "assisted-tuck-front-lever",
]);

function isHoldExercise(exerciseIdOrName) {
  if (HOLD_EXERCISE_IDS.has(exerciseIdOrName)) return true;
  const match = exercises.find(x => x.name === exerciseIdOrName || x.id === exerciseIdOrName);
  return match ? HOLD_EXERCISE_IDS.has(match.id) : false;
}

// "level X (horizontal)" for a push/pull exercise — the plane-specific
// level plus which plane it's from, so it's visible which of the two
// independent tracks a given exercise's difficulty is measured against.
// Falls back to the flat level for every other muscle group.
function isBellExercise(e) {
  const x = typeof e === "string" ? exercises.find(i => i.name === e || i.id === e) : (e && e.equipment ? e : exercises.find(i => i.name === (e && e.name)));
  return !!x && x.equipment === "kettlebell";
}
function levelLabelFor(e) {
  if (isBellExercise(e)) return "kettlebell · progress by weight and reps";
  if (e.muscle_group !== "push" && e.muscle_group !== "pull") {
    return `level ${state.progressLevels?.[e.muscle_group] || 1}`;
  }
  const plane = planeOf(e.name, e.muscle_group);
  const lvl = state.planeLevels?.[`${e.muscle_group}_${plane}`] || 1;
  return `level ${lvl} (${plane === "h" ? "horizontal" : "vertical"})`;
}

// " · straps: 8.5" appended to a ring push exercise's meta line — the
// separate, continuous progression axis tracked in Settings, push only
// (see the note in applyWorkoutResults for why pull doesn't use this).
function ringStrapNoteFor(e) {
  if (e.muscle_group !== "push") return "";
  const libEx = exercises.find(x => x.name === e.name);
  if (!libEx || libEx.equipment !== "rings") return "";
  const val = state.ringStrap?.push;
  if (val == null) return "";
  return ` · straps: ${val}`;
}

async function loadExercises() {
  if (WORKER_URL) {
    try {
      exercises = await apiFetch("/api/exercises", { method: "GET" });
      const builtinIds = new Set(BUILTIN_EXERCISES.map(e => e.id));
      const existingById = new Map(exercises.map(e => [e.id, e]));
      const toSync = BUILTIN_EXERCISES.filter(e => {
        const existing = existingById.get(e.id);
        if (!existing) return true; // missing entirely
        // also re-sync if a field has drifted from the current library definition
        return existing.name !== e.name || existing.muscle_group !== e.muscle_group ||
               existing.equipment !== e.equipment || existing.cue !== e.cue;
      });
      // The D1-backed store is additive by default — syncing above only
      // ever inserts/updates rows for ids still in BUILTIN_EXERCISES, so an
      // exercise renamed or removed from the library in code (e.g. the
      // bar->rings conversion) left its old row sitting in D1 forever,
      // still served by every GET. That's how a stale "Pull-up"/"Toes to
      // bar" kept reappearing in newly-generated workouts no matter how
      // many times the cache was cleared or the library edited — the data
      // itself was never pruned. Only ever prunes rows tagged source
      // "builtin" (never a person's own custom exercises) whose id no
      // longer exists in the current BUILTIN_EXERCISES.
      const toPrune = exercises.filter(e => e.source === "builtin" && !builtinIds.has(e.id));
      for (const ex of toSync) {
        await apiFetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...ex, source: "builtin" }),
        });
      }
      for (const ex of toPrune) {
        await apiFetch("/api/exercises/" + ex.id, { method: "DELETE" });
      }
      if (toSync.length || toPrune.length) exercises = await apiFetch("/api/exercises", { method: "GET" });
      return;
    } catch (e) { /* fall through to local */ }
  }
  exercises = BUILTIN_EXERCISES.map(e => ({ ...e, source: "builtin", locked: 1 }));
}

function levelBucket(level) {
  if (level <= 2) return "beginner";
  if (level === 3) return "standard";
  return "advanced";
}

function equipmentBucket(equipment) {
  const e = (equipment || "bodyweight").toLowerCase();
  // No fixed-bar equipment exists in this library — every exercise is
  // bodyweight, rings, parallettes, ab wheel, dumbbell, or band — so there's
  // no "bar" bucket/filter chip to route into.
  if (e.includes("ring")) return "rings";
  if (e.includes("parallette")) return "parallettes";
  if (e.includes("ab wheel")) return "ab-wheel";
  if (e.includes("dumbbell")) return "dumbbell";
  if (e.includes("kettlebell")) return "kettlebell";
  if (e.includes("band")) return "band";
  return "bodyweight";
}

function renderExercises(filterText = "", muscleGroup = "all", levelFilter = "all", equipFilter = "all") {
  const list = document.getElementById("exerciseList");
  const filtered = exercises.filter(e => {
    const matchesText = e.name.toLowerCase().includes(filterText.toLowerCase());
    const matchesMg = muscleGroup === "all" || e.muscle_group === muscleGroup;
    const matchesLevel = levelFilter === "all" || levelBucket(levelOf(e.id)) === levelFilter;
    const matchesEquip = equipFilter === "all" || equipmentBucket(e.equipment) === equipFilter;
    return matchesText && matchesMg && matchesLevel && matchesEquip;
  });
  if (!filtered.length) { list.innerHTML = '<div class="empty">No matches.</div>'; return; }

  const groups = {};
  filtered.forEach(e => { (groups[e.muscle_group] ||= []).push(e); });
  const isFiltering = !!filterText || muscleGroup !== "all" || levelFilter !== "all" || equipFilter !== "all";

  list.innerHTML = Object.entries(groups).map(([mg, items]) => `
    <details class="exercise-group" ${isFiltering ? "open" : ""}>
      <summary>${mg} <span class="meta" style="display:inline;">(${items.length})</span></summary>
      <div style="padding-top:4px;">
        ${items.map(e => `
          <div class="list-item">
            <div>
              <div class="name">${e.name}</div>
              <div class="meta">${e.equipment || "bodyweight"} · level ${levelOf(e.id)}${e.source === "builtin" ? "" : " · " + e.source}</div>
              ${howToHtml("lib-" + e.id, e.name, e.cue)}
            </div>
            ${e.source !== "builtin" ? `<button class="danger-link" data-del-ex="${e.id}">Delete</button>` : ""}
          </div>
        `).join("")}
      </div>
    </details>
  `).join("");
}

// ---- programs ----
// One-time catch-up: if the stored built-in kettlebell program predates the arm
// work (curl + overhead triceps extension), bring its structure up to date.
// Same program id, so progress carries over. Safe to repeat: it only acts when
// the arm moves are missing.
async function migrateKbProgramArms() {
  try {
    const p = (programs || []).find(x => x.source === "built-in" && /^Kettlebell A\/B \(one bell\) v2/.test(x.name || ""));
    if (!p || !p.structure || (p.structure.rev || 0) >= 5) return;
    const fresh = kbProgram();
    await apiFetch("/api/programs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, name: p.name, duration_weeks: p.duration_weeks, source: p.source, structure: fresh.structure }),
    });
    await loadPrograms();
  } catch (e) { /* retried next open */ }
}
async function loadPrograms() {
  if (WORKER_URL) {
    try { programs = await apiFetch("/api/programs", { method: "GET" }); return; }
    catch (e) { /* fall through */ }
  }
  programs = [];
}

// ---- Program screen ("Steady" look) ----
let tfProgWeek = null;
function renderSettingsTiles() {
  const el = document.getElementById("tfSetTiles");
  if (!el) return;
  const t = state.settings?.macroTargets || {};
  const goal = state.settings?.weeklyWorkoutGoal || 3;
  const cell = (v, u, l) => `<div class="tf-rt"><div class="rv">${v || "·"}<small>${v ? " " + u : ""}</small></div><div class="rl">${l}</div></div>`;
  el.innerHTML = cell(t.calories, "cal", "calories") + cell(t.protein, "g", "protein") + cell(goal, "/ wk", "workout goal");
  const tv = document.getElementById("setTargetsVal");
  if (tv) tv.textContent = [t.calories ? Number(t.calories).toLocaleString() + " cal" : "", t.protein ? t.protein + " g protein" : ""].filter(Boolean).join(" · ");
  const bv = document.getElementById("setBodyVal");
  if (bv) bv.textContent = state.settings?.heightInches ? state.settings.heightInches + " in" : "";
}
function renderProgramView() {
  const el = document.getElementById("tfProgramView");
  if (!el) return;
  const program = programs.find(p => p.id === state.activeProgramId);
  if (!program || !program.structure || !program.structure.phases) {
    el.innerHTML = '<div class="tf-empty" style="padding:20px 4px;">No active program yet. Open "All programs" below and tap Use on one.</div>';
    return;
  }
  const esc = escapeHtml;
  const cp = currentPhaseFor(program);
  const maxWeek = programMaxWeek(program);
  const cur = Math.min(cp.weekNumber, maxWeek);
  if (tfProgWeek === null || tfProgWeek > maxWeek || tfProgWeek < 1) tfProgWeek = cur;
  const wk = tfProgWeek;
  const phase = phaseForWeek(program, wk);
  const pace = getProgramPace(program);
  const total = totalProgramWorkouts(program);
  const done = pace.mode === "count" ? pace.completed : null;
  const pct = done === null ? Math.round(((cur - 1) / maxWeek) * 100) : Math.round((done / total) * 100);
  const perWeek = workoutsInWeek(program, cur);
  const pw = state.pendingWorkout && state.pendingWorkout.programId === program.id ? state.pendingWorkout : null;
  let upIdx = pw ? pw.dayIndex : 0;
  if (done !== null) { let before = 0; for (let w = 1; w < cur; w++) before += workoutsInWeek(program, w); upIdx = Math.max(0, done - before); }
  const days = (phase?.days || []).filter(d => (d.slots || []).length > 0 || d.fixed);
  const isDeload = (phase?.deload_weeks || []).includes(wk);

  const tabs = Array.from({ length: maxWeek }, (_, i) => `<button type="button" data-pweek="${i + 1}" class="${i + 1 === wk ? "on" : ""}">Wk ${i + 1}</button>`).join("");
  const cards = days.map((d, i) => {
    let st = "pre";
    if (wk < cur) st = "done"; else if (wk === cur) st = i < upIdx ? "done" : i === upIdx ? "next" : "pre";
    const label = st === "done" ? `Day ${i + 1} · done` : st === "next" ? `Day ${i + 1} · up next` : `Day ${i + 1}`;
    const icon = st === "done"
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Done"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
      : st === "next" ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Open"><path d="M9 5l7 7-7 7"/></svg>'
      : '<span style="font-size:12px;color:var(--text-muted);">Preview</span>';
    let exs = "";
    if (d.fixed) {
      exs = d.fixed.exercises.map(f => { const v = kbFinisherVariant(f, wk); const x = BUILTIN_EXERCISES.find(b => b.id === ((v && v.id) || f.id)); const nm = x ? x.name : f.id; const reps = (v && v.reps) || f.reps; return `<button type="button" class="tf-exlink" data-pexinfo="${esc(nm)}"><span>${esc(nm)} ${esc(String(f.sets))}×${esc(String(reps))}</span><b>How to ›</b></button>`; }).join("");
    } else {
      exs = (d.slots || []).map(s => `${esc(s.muscle_group)} ${esc(String(s.sets))}×${esc(String(s.reps))}`).join("<br>");
    }
    return `<div class="tf-dcard ${st}" data-dcard><div class="r"><div><div class="k">${label}</div><div class="t">${esc(String(d.day || ""))}</div></div>${icon}</div><div class="ex hidden">${exs}</div></div>`;
  }).join("");

  const pills = `<span class="on">${esc(String(program.source || "program"))}</span><span>${maxWeek} weeks</span>${program.structure.session?.days ? `<span>${program.structure.session.days} days/wk</span>` : `<span>${perWeek} days/wk</span>`}`;
  el.innerHTML = `<div class="tf-prog-head"><button type="button" class="chg" id="tfChangeProgram">Change program</button><div class="pills">${pills}</div><h2>${esc(program.name)}</h2></div>
    <div class="tf-wktabs" id="tfWkTabs">${tabs}</div>
    <div class="tf-pbar"><b>${pct}%</b><div class="bar"><i style="width:${pct}%"></i></div><span>${done === null ? `wk ${cur} / ${maxWeek}` : `${done} / ${total}`}</span></div>
    <div class="tf-pnote">${esc(String(phase?.phase || ""))}${isDeload ? " · deload week" : ""}${wk !== cur ? ` · viewing week ${wk}` : ""}${days.some(d => d.fixed && d.fixed.exercises.some(f => KB_FINISHER_ROTATION[f.id])) ? " · push-up and core finishers rotate weekly" : ""}</div>
    <div class="tf-days-list">${cards}</div>`;
  const on = el.querySelector("#tfWkTabs button.on");
  if (on) { const bar = el.querySelector("#tfWkTabs"); bar.scrollLeft = on.offsetLeft - 16; }
}
document.getElementById("tfProgramView").addEventListener("click", (e) => {
  const w = e.target.closest("[data-pweek]");
  if (w) { tfProgWeek = parseInt(w.dataset.pweek, 10); renderProgramView(); return; }
  if (e.target.closest("#tfChangeProgram")) {
    const d = document.getElementById("programManage"); d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); return;
  }
  const xl = e.target.closest("[data-pexinfo]");
  if (xl) { openExerciseSheet(xl.dataset.pexinfo); return; }
  const c = e.target.closest("[data-dcard]");
  if (c) c.querySelector(".ex").classList.toggle("hidden");
});

function renderPrograms() {
  const list = document.getElementById("programList");
  if (!programs.length) { list.innerHTML = '<div class="empty">None yet.</div>'; try { renderProgramView(); } catch (e) {} return; }
  list.innerHTML = programs.map(p => `
    <div class="list-item" style="flex-direction:column; align-items:stretch;">
      <div class="name">${p.name}</div>
      <div class="meta">${p.duration_weeks} weeks · ${p.source}${state.activeProgramId === p.id ? " · active" : ""}</div>
      <div class="meta">${getProgramPace(p).mode === "count" ? `Paced by workouts · ${getProgramPace(p).completed} of ${totalProgramWorkouts(p)} done` : "Paced by calendar"}</div>
      <div class="row mt10">
        <button class="secondary" data-preview-program="${p.id}" style="padding:6px 10px; font-size:13px;">Preview</button>
        <button class="secondary" data-use-program="${p.id}" style="padding:6px 10px; font-size:13px;">Use</button>
        <button class="secondary" data-pace-program="${p.id}" style="padding:6px 10px; font-size:13px;">${getProgramPace(p).mode === "count" ? "Switch to calendar pace" : "Switch to workout pace"}</button>
        <button class="danger-link" data-del-program="${p.id}" style="margin-left:auto;">Delete</button>
      </div>
      <div class="preview-panel hidden" data-preview-panel="${p.id}" style="margin-top:10px;"></div>
    </div>
  `).join("");
  renderActiveProgramInfo();
  try { renderProgramView(); } catch (e) { console.error("renderProgramView", e); }
}

function renderProgramPreview(program) {
  const phases = program.structure.phases || [];
  if (!phases.length) return '<div class="empty">No phase structure found for this program.</div>';
  return phases.map(ph => `
    <div style="border-top:1px solid var(--border); padding-top:8px; margin-top:8px;">
      <div class="name">${ph.phase} · weeks ${ph.week_start}-${ph.week_end}${ph.deload_weeks?.length ? ` (deload: wk ${ph.deload_weeks.join(", ")})` : ""}</div>
      ${(ph.days || []).map(d => `
        <div class="meta mt6"><strong style="color:var(--text);">${d.day}</strong>${d.fixed ? " · about " + estimateWorkoutMinutes(buildFixedWorkout(d, false)) + " min" : ""}</div>
        <div class="meta">${d.fixed ? d.fixed.exercises.map(f => { const x = BUILTIN_EXERCISES.find(b => b.id === f.id); return `${x ? x.name : f.id} ${f.sets}×${f.reps}`; }).join(" · ") : (d.slots || []).map(s => `${s.muscle_group} ${s.sets}×${s.reps}`).join(" · ")}</div>
      `).join("")}
    </div>
  `).join("");
}

// Compares actual weight trend from logged measurements against a target
// recomp pace (0.25-0.5% bodyweight/week). Suggests a calorie nudge — from
// carbs only — rather than changing anything automatically.
// Shared weight-trend calculation used by both the macro-calorie suggestion
// and the Recovery status breakdown. Two fixes over the original per-caller
// logic, both found from a real case: a single flagged "noise" day (travel/
// alcohol bloat) landing right at the window's edge swung the computed pace
// from about -0.1%/week to -1.18%/week — a fully opposite recommendation —
// with nothing about the actual trend having changed.
//   1. Fits a least-squares trend line across every point in the window
//      instead of just drawing a line between the first and last point.
//      One noisy day at either edge can no longer single-handedly swing
//      the result the way an endpoint-to-endpoint calc does.
//   2. Excludes measurements you've already flagged with a check-in reason
//      (travel, alcohol, dehydration, illness, etc.) from the fit when
//      there's enough unflagged data to still get a trend — you've already
//      told the app those don't represent your real trajectory, so they
//      shouldn't anchor the "what's my real trend" calculation. Falls back
//      to including them (noting how many) rather than refusing to answer
//      if excluding them leaves too little data.
// Relative Fat Mass (RFM) body-fat % estimate, male formula (the app has no
// notion of sex elsewhere, so this is the one variant implemented — the
// female formula uses 76 instead of 64). Published 2018 (Woolcott & Bergman),
// validated against DEXA scans; unlike the Navy method it depends only on
// waist-to-height ratio, not a waist-minus-neck difference, so it doesn't
// score a thicker neck as leaner and tracks abdominal fat more realistically.
// All inputs in inches. Returns null for missing/non-positive inputs.
function relativeFatMassPct(waistIn, heightIn) {
  if (!(waistIn > 0) || !(heightIn > 0)) return null;
  return 64 - 20 * (heightIn / waistIn);
}

// Mirrors computeWeightTrend's regression approach, but over bodyFatPct
// entries, which are occasional (only logged when neck+waist are both
// given) rather than near-daily — hence the much wider default window and
// no "flagged reason" exclusion, since body-fat check-ins don't go through
// the same up/down check-in flow as weight.
function computeBodyFatTrend(windowDays = 60) {
  const ms = (state.measurements || [])
    .filter(m => typeof m.bodyFatPct === "number")
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (ms.length < 1) return null;
  const latestEntry = ms[ms.length - 1];
  // Not enough points (or not enough), or not enough — still report the most
  // recent reading with ptsPerWeek: null rather than hiding it entirely. A
  // first-ever neck+waist log is real data the person just entered; showing
  // the same "log neck + waist" prompt they just acted on reads as if
  // nothing happened. The trend line itself genuinely needs 2+ points
  // spanning a real window, which callers check via ptsPerWeek === null.
  const notEnoughForTrend = { ptsPerWeek: null, days: 0, n: ms.length, latest: latestEntry.bodyFatPct, latestDate: latestEntry.date };
  if (ms.length < 2) return notEnoughForTrend;

  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const windowSet = ms.filter(m => new Date(m.date).getTime() >= cutoff);
  const set = windowSet.length >= 2 ? windowSet : ms.slice(-2);
  if (set.length < 2) return notEnoughForTrend;

  const first = set[0], last = set[set.length - 1];
  const days = (new Date(last.date) - new Date(first.date)) / (24 * 60 * 60 * 1000);
  if (days < 5) return notEnoughForTrend;

  const t0 = new Date(set[0].date).getTime();
  const xs = set.map(m => (new Date(m.date).getTime() - t0) / (24 * 60 * 60 * 1000));
  const ys = set.map(m => m.bodyFatPct);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const slopePerDay = den === 0 ? 0 : num / den; // percentage points per day
  return { ptsPerWeek: slopePerDay * 7, days, n, latest: latestEntry.bodyFatPct, latestDate: latestEntry.date };
}

function computeWeightTrend(windowDays = 14) {
  const ms = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (ms.length < 2) return null;

  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const recentAll = ms.filter(m => new Date(m.date).getTime() >= cutoff);
  // Every weigh-in counts, tagged or not: a swing is information, not something to filter out.
  const recentClean = recentAll;

  let windowSet, excludedFlagged = 0;
  if (recentClean.length >= 2) {
    windowSet = recentClean;
    excludedFlagged = recentAll.length - recentClean.length;
  } else if (recentAll.length >= 2) {
    windowSet = recentAll; // not enough unflagged points — use everything rather than nothing
  } else {
    windowSet = ms.slice(-2); // not enough in-window at all — fall back to the last two logged, period
  }
  if (windowSet.length < 2) return null;

  const first = windowSet[0], last = windowSet[windowSet.length - 1];
  const days = (new Date(last.date) - new Date(first.date)) / (24 * 60 * 60 * 1000);
  if (days < 5) return null; // not enough spread to trust a rate yet

  const t0 = new Date(windowSet[0].date).getTime();
  const xs = windowSet.map(m => (new Date(m.date).getTime() - t0) / (24 * 60 * 60 * 1000)); // days since window start
  const ys = windowSet.map(m => m.weight);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  // Theil-Sen: the median of all pairwise slopes. Every weigh-in counts, but one salty-dinner
  // spike can't drag the trend the way a plain regression line would.
  const pair = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (xs[j] - xs[i] >= 1) pair.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
  pair.sort((p, q) => p - q);
  const slopePerDay = pair.length ? (pair.length % 2 ? pair[(pair.length - 1) / 2] : (pair[pair.length / 2 - 1] + pair[pair.length / 2]) / 2) : (den === 0 ? 0 : num / den); // lb/day
  const pctPerWeek = (slopePerDay * 7 / meanY) * 100;

  return { pctPerWeek, lbPerWeek: slopePerDay * 7, days, n, excludedFlagged };
}
