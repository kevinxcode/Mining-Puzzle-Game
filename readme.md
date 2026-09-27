# ROLE

use superpower.


You are a **Senior React Native Game Engineer, Game Systems Designer, Mobile UI/UX Designer, and Puzzle Game Architect**.

Your task is to design and implement a polished mobile strategy puzzle game with the working title:

# MINING FLOW

The game is about managing a small mining operation using:

* Excavators
* Dump trucks
* Haul roads
* Loading points
* Dumping points
* Fuel
* Queue management
* Production targets
* Time constraints
* Vehicle capacity
* Route planning

The game must be fictional and generic.

Do NOT use any real mining company branding, logo, name, site map, or corporate identity.

The final product should feel like a modern casual strategy puzzle game, not an industrial simulator.

---

# 1. CORE GAME IDEA

The player manages mining equipment on a compact puzzle map.

Each level has a production target.

Example:

```text
TARGET
Move 120 tons of material
Time limit: 4 minutes
Available units:
- 1 Excavator
- 3 Dump Trucks
```

The player must:

1. Assign dump trucks to excavators
2. Select loading order
3. Select haul routes
4. Prevent traffic jams
5. Avoid vehicle conflicts
6. Manage fuel
7. Reach production target
8. Minimize idle time
9. Finish within time
10. Earn stars based on efficiency

The game should be easy to understand but strategically deeper at higher levels.

---

# 2. TARGET PLATFORM

Build with:

* React Native
* Expo
* TypeScript

Target:

* Android
* iOS
* Tablets

The game must work well in portrait orientation.

Optional landscape support can be considered for tablets.

---

# 3. TECH STACK

Use:

* React Native
* Expo
* TypeScript
* Expo Router
* React Native Reanimated
* React Native Gesture Handler
* Zustand
* AsyncStorage
* Expo Haptics
* Expo Audio
* Lucide React Native

Optional only if justified:

* Skia for advanced rendering
* SVG for route visualization

Do not add heavy dependencies unnecessarily.

---

# 4. GAME LOOP

Main loop:

```text
Choose Level
↓
Read Mission
↓
Place / Assign Equipment
↓
Choose Routes
↓
Start Operation
↓
Observe Production
↓
Adjust Assignments
↓
Complete Target
↓
Receive Stars + Coins + XP
↓
Unlock Next Level
```

The gameplay should combine:

* Planning
* Timing
* Optimization
* Resource management
* Puzzle solving

---

# 5. LEVEL STRUCTURE

Create at least:

# 60 LEVELS

Divide into 6 regions:

```text
REGION 1 — Training Pit
Levels 1–10

REGION 2 — Ridge Mine
Levels 11–20

REGION 3 — Canyon Site
Levels 21–30

REGION 4 — Dust Valley
Levels 31–40

REGION 5 — Deep Basin
Levels 41–50

REGION 6 — Iron Frontier
Levels 51–60
```

Each region introduces new gameplay mechanics.

---

# 6. DIFFICULTY PROGRESSION

## LEVELS 1–5

Teach basics:

* Assign truck
* Load material
* Drive to dump point
* Return to excavator

No traffic complexity.

---

## LEVELS 6–10

Introduce:

* Multiple dump trucks
* Queue management
* Limited time

---

## LEVELS 11–20

Introduce:

* Multiple excavators
* Different truck capacities
* Route choices
* Traffic intersections

---

## LEVELS 21–30

Introduce:

* Fuel usage
* Refueling station
* Road speed limits
* Equipment efficiency

---

## LEVELS 31–40

Introduce:

* Road closures
* Mud zones
* Narrow roads
* Truck priority
* Temporary breakdowns

---

## LEVELS 41–50

Introduce:

* Multiple material types
* Different dump destinations
* Production quotas
* Dynamic objectives

---

## LEVELS 51–60

Introduce advanced challenges:

* Limited equipment
* Long haul
* High traffic
* Fuel constraints
* Multiple production objectives
* Efficiency targets
* Dynamic road conditions

---

# 7. LEVEL OBJECTIVES

Each level can combine objectives.

Examples:

```text
Move 150 tons

Complete under 4 minutes

Keep truck idle time below 20%

Use less than 60 L fuel

Avoid traffic jam

Complete with only 2 trucks

Deliver 80 tons coal + 40 tons overburden
```

Do not make every level only about moving more material.

---

# 8. STAR SYSTEM

Each level awards up to 3 stars.

Example:

```text
1 STAR
Complete target

2 STARS
Complete under target time

3 STARS
Meet efficiency requirement
```

Advanced criteria:

* Low fuel usage
* Low idle time
* No traffic jam
* Zero breakdown
* High production rate

Store best star result permanently.

---

# 9. GAME MAP

Use a compact stylized mining map.

The map should include:

* Excavation area
* Loading points
* Haul roads
* Intersections
* Dump areas
* Fuel station
* Workshop
* Parking / standby area

The art direction should be stylized.

Do NOT attempt photorealism.

Think:

```text
Modern strategy game
+
Low-poly industrial aesthetic
+
Clean readable mobile UI
```

---

# 10. EQUIPMENT TYPES

## EXCAVATORS

Each excavator can have:

```ts
interface Excavator {
  id: string;
  name: string;
  bucketCapacity: number;
  loadingSpeed: number;
  fuelEfficiency: number;
  condition: number;
  position: Point;
}
```

Example classes:

```text
Compact Excavator
Standard Excavator
Heavy Excavator
Ultra Excavator
```

---

# 11. DUMP TRUCK TYPES

Each truck has:

```ts
interface DumpTruck {
  id: string;
  name: string;
  capacity: number;
  speed: number;
  fuelEfficiency: number;
  condition: number;
  state: TruckState;
}
```

States:

```ts
type TruckState =
  | 'idle'
  | 'driving-to-loader'
  | 'queueing'
  | 'loading'
  | 'hauling'
  | 'dumping'
  | 'returning'
  | 'refueling'
  | 'breakdown';
```

Create several truck classes:

```text
Light Hauler
Standard Hauler
Heavy Hauler
Ultra Hauler
```

---

# 12. LOADING SYSTEM

Each excavator loads trucks based on:

```text
Truck Capacity
÷
Bucket Capacity
=
Number of passes
```

Example:

Truck:

```text
Capacity = 40 tons
```

Excavator:

```text
Bucket = 10 tons
```

Required:

```text
4 passes
```

Each pass takes time.

Allow progression upgrades to reduce loading time.

---

# 13. ROUTE SYSTEM

Players must choose truck routes.

Each route contains:

```ts
interface Route {
  id: string;
  distance: number;
  speedLimit: number;
  trafficLevel: number;
  fuelCost: number;
  riskLevel: number;
}
```

Example route decision:

```text
ROUTE A
Short
Slow
High traffic

ROUTE B
Long
Fast
Low traffic
```

The shortest route should NOT always be the best choice.

---

# 14. TRAFFIC SYSTEM

Add lightweight traffic logic.

Trucks can:

* Queue
* Slow down
* Wait at intersections
* Block narrow roads
* Cause congestion

Do not create overly realistic traffic physics.

Keep it understandable for casual players.

---

# 15. PLAYER CONTROLS

Players should interact using:

* Tap
* Drag
* Route selection
* Unit cards
* Bottom sheets

Examples:

Tap truck:

```text
TRUCK DT-03

Capacity: 40t
Fuel: 78%
Status: Loading

Assigned:
Excavator EX-02

Route:
B → Crusher
```

Actions:

```text
Change Excavator
Change Route
Pause Truck
Send to Fuel
```

---

# 16. REAL-TIME OPERATION MODE

Once the player presses:

# START OPERATION

The simulation begins.

Vehicles move automatically based on player configuration.

Players can still:

* Reroute trucks
* Reassign trucks
* Send truck to fuel
* Pause units

The gameplay should feel interactive, not purely setup-and-watch.

---

# 17. PRODUCTION SYSTEM

Show real-time KPIs:

```text
Production
320 t/h

Target
180 / 300 tons

Truck Utilization
82%

Excavator Utilization
91%

Average Queue
14 sec

Fuel Used
42 L
```

Keep the display simple and readable.

Do not overload the screen with industrial dashboards.

---

# 18. SCORING SYSTEM

Final score should consider:

```text
Production
Efficiency
Fuel usage
Idle time
Queue time
Completion speed
Traffic penalty
```

Example:

```ts
score =
  productionScore +
  efficiencyBonus +
  timeBonus +
  fuelBonus -
  trafficPenalty;
```

Do not rely only on completion time.

---

# 19. PLAYER PROGRESSION

Player profile:

```text
Player Level
XP
Coins
Stars
Completed Levels
Efficiency Rating
Best Production Rate
```

XP rewards:

```text
Level completion
+100 XP

3 stars
+50 XP

Efficiency bonus
+25 XP
```

---

# 20. EQUIPMENT UNLOCKS

Progression unlocks equipment.

Example:

```text
LEVEL 1
Standard Truck

LEVEL 10
Heavy Truck

LEVEL 20
Heavy Excavator

LEVEL 30
Fuel-efficient Hauler

LEVEL 40
High-speed Hauler

LEVEL 50
Ultra Excavator
```

Do not use pay-to-win mechanics.

All equipment should be unlockable through gameplay.

---

# 21. UPGRADES

Allow light progression upgrades.

Examples:

## Excavator

```text
Loading Speed
Bucket Capacity
Fuel Efficiency
Reliability
```

## Truck

```text
Capacity
Speed
Fuel Efficiency
Durability
```

Avoid overly complex RPG stats.

Keep upgrade choices strategic and understandable.

---

# 22. EVENT SYSTEM

Later levels can include random or scripted events.

Examples:

```text
Road blocked

Truck breakdown

Rain slows road

Fuel station unavailable

Production target increased

Temporary shortcut opened

Excavator efficiency reduced
```

These events should create interesting decisions without feeling unfair.

---

# 23. HOME SCREEN

Create a premium modern home screen.

Structure:

```text
┌───────────────────────────┐
│ Lv 12     2,450 XP      ⚙ │
│                           │
│       MINING FLOW         │
│  Logistics Puzzle Game    │
│                           │
│     ▶ CONTINUE            │
│                           │
│     🗺 CAMPAIGN           │
│     🚜 EQUIPMENT          │
│     📊 STATISTICS         │
│     🏆 ACHIEVEMENTS       │
│                           │
│ ⭐ 47          🪙 1,250    │
└───────────────────────────┘
```

Do not copy literally.

Use as UX direction.

---

# 24. VISUAL STYLE

Use a contemporary 2026 mobile-game visual direction.

Style:

* Clean
* Modern
* Tactical
* Friendly
* Premium
* Industrial but playful

Avoid:

* Enterprise dashboard look
* Dark cyberpunk overload
* Excessive neon
* Excessive gradients
* Generic Bootstrap cards
* Tiny text
* Cluttered controls

Preferred design direction:

```text
Warm neutral background
Dark graphite surfaces
Safety orange accent
Mining yellow secondary accent
Cool cyan for information
Green for success
Red only for warnings
```

The game should visually communicate mining without looking corporate.

---

# 25. MAP DESIGN

Use stylized terrain.

Include:

* Dirt roads
* Quarry walls
* Stockpiles
* Rocks
* Trees
* Water puddles
* Cones
* Road signs
* Dump zones

Use subtle animation:

* Dust behind trucks
* Excavator arm movement
* Loading particles
* Dump animation
* Moving wheels
* Small environmental motion

---

# 26. MODERN UX PRINCIPLES

The UI should feel updated.

Use:

* Large readable typography
* Floating bottom control bar
* Contextual bottom sheets
* Animated progress indicators
* Clear equipment status
* Soft elevation
* Consistent spacing
* Minimal clutter
* Gesture-first interaction

Avoid showing information unless it is needed.

Use progressive disclosure.

---

# 27. MAIN GAME SCREEN

Suggested hierarchy:

```text
MISSION HEADER

Target
180 / 300 t

Time
02:45

⭐ ⭐ ☆

────────────

        MINING MAP

 EX-01       DT-01
             DT-02

      haul roads

────────────

Production
245 t/h

[ EQUIPMENT ] [ ROUTES ] [ SPEED ]
```

Keep map as the main focus.

---

# 28. SPEED CONTROL

Allow:

```text
1x
2x
3x
Pause
```

Do not allow extreme simulation speeds that break readability.

---

# 29. EQUIPMENT PANEL

Use bottom sheet.

Example:

```text
DT-04

Status
Hauling

Load
40 / 40 t

Fuel
68%

Route
Route B

ETA
21 sec

[ REROUTE ]

[ SEND TO FUEL ]
```

---

# 30. MISSION BRIEFING

Before each level show:

```text
LEVEL 18
RIDGE MINE

TARGET

Move 300 tons

LIMITS

3 Trucks
1 Excavator

CHALLENGE

Keep queue time under 25 sec

BONUS

Use less than 80 L fuel

[ START ]
```

---

# 31. LEVEL COMPLETE

Create satisfying result screen.

Example:

```text
MISSION COMPLETE

⭐⭐⭐

Production
320 / 300 t

Time
3:42

Efficiency
92%

Fuel
72 L

Queue
16 sec

+150 XP
+75 Coins

[ NEXT LEVEL ]

[ REPLAY ]

[ HOME ]
```

Animate stars and rewards.

---

# 32. LEVEL FAILED

Failure must feel encouraging.

Example:

```text
TARGET MISSED

Production
268 / 300 t

Main issue:
Truck queue too long

TIP:
Move one truck from EX-01
to EX-02.

[ RETRY ]

[ CHANGE STRATEGY ]
```

Provide useful feedback instead of generic failure.

---

# 33. CAMPAIGN MAP

Create a visually appealing regional map.

Example:

```text
Training Pit
● 1
│
● 2
│
● 3

Ridge Mine
● 11
│
● 12
```

Each region should have unique visual identity.

---

# 34. ACHIEVEMENTS

Examples:

```text
First Load
Complete Level 1

Smooth Operator
Finish without traffic jam

Fuel Saver
Complete using 20% less fuel

Zero Idle
Keep idle time below 5%

Perfect Shift
Earn 3 stars

Heavy Hauler
Move 10,000 tons

Logistics Master
Complete 60 levels
```

---

# 35. STATISTICS

Track:

```text
Total Tons Moved
Total Trips
Average Production Rate
Average Efficiency
Total Fuel Used
Levels Completed
3-Star Levels
Best Completion Time
Total Playtime
```

Use simple charts and progress visuals.

---

# 36. TUTORIAL SYSTEM

Use contextual tutorial.

Do NOT show long instruction screens.

Examples:

Level 1:

```text
Tap the truck.
```

Then:

```text
Assign it to the excavator.
```

Then:

```text
Choose a route.
```

Then:

```text
Start Operation.
```

Keep tutorials interactive.

---

# 37. SAVE SYSTEM

Persist:

```text
Progress
Stars
XP
Coins
Equipment
Upgrades
Achievements
Statistics
Settings
```

Use AsyncStorage.

Provide versioned save format for future updates.

---

# 38. GAME STATE

Suggested architecture:

```ts
interface LevelState {
  status: 'briefing' | 'planning' | 'running' | 'paused' | 'completed' | 'failed';
  elapsedTime: number;
  production: number;
  fuelUsed: number;
  trucks: DumpTruck[];
  excavators: Excavator[];
  routes: Route[];
}
```

Separate:

```text
Simulation engine

UI state

Progression state

Persistence
```

---

# 39. SIMULATION ENGINE

Create a deterministic lightweight engine.

Each tick should update:

```text
Truck movement
Loading progress
Dumping progress
Fuel usage
Queue
Production
Events
Mission status
```

Keep simulation independent from React components.

Suggested structure:

```text
src/game/
  engine/
    simulationEngine.ts
    truckEngine.ts
    excavatorEngine.ts
    routeEngine.ts
    productionEngine.ts
    eventEngine.ts
```

---

# 40. PERFORMANCE

Target smooth 60 FPS UI.

Do not update the full React tree every simulation tick.

Separate:

```text
High-frequency simulation state

from

UI state
```

Use efficient subscriptions.

Memoize map elements when appropriate.

Avoid excessive animated objects.

---

# 41. GAME SPEED

Simulation engine should support:

```ts
simulationSpeed:
  | 0
  | 1
  | 2
  | 3;
```

Changing speed should not change simulation outcome.

---

# 42. GAME BALANCING

Do not hardcode balancing values everywhere.

Create configuration files.

Example:

```text
config/
  trucks.ts
  excavators.ts
  routes.ts
  levels.ts
  upgrades.ts
  rewards.ts
```

Make values easy to tune.

---

# 43. LEVEL CONFIGURATION

Levels should be data-driven.

Example:

```ts
interface LevelConfig {
  id: number;
  region: string;

  productionTarget: number;

  timeLimit: number;

  availableTrucks: string[];

  availableExcavators: string[];

  routes: RouteConfig[];

  objectives: Objective[];

  events?: LevelEvent[];
}
```

Adding Level 61 later should not require changing core game logic.

---

# 44. DESIGN SYSTEM

Create reusable tokens.

```text
colors
spacing
radius
typography
shadows
animation duration
icon sizes
```

Avoid random style values inside individual screens.

---

# 45. COMPONENT SYSTEM

Build reusable components:

```text
GameMap
TruckUnit
ExcavatorUnit
RouteLine
MissionHeader
ProductionMeter
EquipmentSheet
RouteSheet
LevelCard
RegionCard
StarRating
XPBar
StatCard
PrimaryButton
IconButton
MissionResult
TutorialCoachmark
```

---

# 46. RESPONSIVE DESIGN

Support:

```text
Small Android phone
Large Android phone
iPhone
Tablet
```

Map should scale without becoming unreadable.

Use safe areas.

---

# 47. ACCESSIBILITY

Provide:

* Large touch targets
* High contrast
* Accessible labels
* Color + icon indicators

Do not communicate truck status using color alone.

Example:

```text
Green + checkmark = Running

Orange + clock = Waiting

Red + warning = Breakdown
```

---

# 48. AUDIO

Use subtle audio.

Examples:

* Truck engine
* Excavator loading
* Dumping
* Button tap
* Mission complete
* Star reward

Do not make audio overwhelming.

Provide settings:

```text
Music
SFX
Haptics
```

---

# 49. GAME SETTINGS

Include:

```text
Music
Sound Effects
Haptics
Language
Graphics Quality
Reset Progress
About
```

Prepare architecture for localization.

---

# 50. TESTING

At minimum test:

```text
Truck completes full cycle

Production increases correctly

Fuel decreases correctly

Queue logic works

Truck cannot enter invalid route

Excavator cannot load two trucks simultaneously unless explicitly supported

Mission completion detected

Mission failure detected

Stars calculated correctly

Rewards are only given once

Save/load works
```

---

# 51. EDGE CASES

Handle:

```text
Truck route becomes blocked

Truck fuel reaches zero

No available excavator

All trucks idle

Target achieved while truck is still moving

Player pauses during loading

Player changes speed

Player exits level

App goes background
```

Do not allow save corruption.

---

# 52. UI QUALITY GATE

Before finishing every major screen ask:

```text
Is the primary action obvious?

Can the player understand current production instantly?

Can truck status be understood without opening details?

Does the map remain the visual focus?

Are controls reachable with one hand?

Is there unnecessary information?

Does the UI feel like a current premium mobile game?

Does it still work on a small phone?
```

Improve the UI when the answer is no.

---

# 53. DEVELOPMENT WORKFLOW

Follow this implementation order.

## PHASE 1

Audit existing project.

## PHASE 2

Create design system and navigation.

## PHASE 3

Create data models and level configuration.

## PHASE 4

Build deterministic simulation engine.

## PHASE 5

Build basic mining map.

## PHASE 6

Implement truck and excavator interactions.

## PHASE 7

Implement production objectives.

## PHASE 8

Implement traffic and routes.

## PHASE 9

Implement 60 levels.

## PHASE 10

Add progression, XP, stars, upgrades.

## PHASE 11

Add statistics and achievements.

## PHASE 12

Add animation, audio, haptics, polish.

## PHASE 13

Testing and optimization.

---

# 54. IMPORTANT RULES

You MUST:

1. Build actual gameplay, not static mockups.
2. Keep simulation logic outside React components.
3. Keep levels data-driven.
4. Keep code strongly typed.
5. Avoid unnecessary dependencies.
6. Make UI responsive.
7. Implement proper save/load.
8. Verify progression.
9. Test core simulation logic.
10. Preserve existing code where reasonable.

Do NOT:

* Use real company branding
* Use real mine data
* Build a corporate dashboard
* Put all logic in one component
* Leave fake buttons
* Leave critical TODO placeholders
* Hardcode 60 levels across UI files
* Use excessive animation
* Use overly realistic industrial complexity

---

# 55. FINAL VERIFICATION

Verify:

```text
[ ] App starts correctly
[ ] Home screen works
[ ] Campaign map works
[ ] Level selection works
[ ] Briefing works
[ ] Truck assignment works
[ ] Excavator assignment works
[ ] Route selection works
[ ] Start operation works
[ ] Truck movement works
[ ] Loading works
[ ] Hauling works
[ ] Dumping works
[ ] Return cycle works
[ ] Fuel works
[ ] Queue works
[ ] Production works
[ ] Speed 1x/2x/3x works
[ ] Pause works
[ ] Level success works
[ ] Level failure works
[ ] Stars work
[ ] XP works
[ ] Coins work
[ ] Equipment unlock works
[ ] Save/load works
[ ] Achievements work
[ ] Statistics work
[ ] TypeScript passes
[ ] Lint passes
[ ] Tests pass
```

Do not declare the project finished before critical gameplay is actually working.

---

# FINAL PRODUCT DIRECTION

The game should feel like:

**A modern casual logistics puzzle game where mining equipment is the theme, not a professional mining simulator.**

Focus on:

1. Fun
2. Strategy
3. Clear visual feedback
4. Short satisfying levels
5. Modern mobile UI/UX
6. Replayability
7. Progressive complexity
8. Strong production-quality architecture

Start by auditing the repository, then design the game architecture before implementing gameplay.
