/**
 * Site Induction — pre-start inspection (P2H) scenarios.
 * The trainee walks around a haul truck, marks every item OK or Defect,
 * then decides whether the truck may operate. Content is data only.
 */

export type PrestartDecision = 'operate' | 'tag-out';
export type PrestartArea = 'walkaround' | 'cab' | 'safety';

/** Non-critical items that may be marked wrong while still passing. */
export const PRESTART_ALLOWED_MISTAKES = 1;

export interface PrestartItem {
  id: string;
  area: PrestartArea;
  label: string;
  /** What the inspector sees or hears. */
  observation: string;
  defect: boolean;
  /** A defect that makes the truck unsafe to operate. */
  critical?: boolean;
  explanation: string;
}

export interface PrestartScenario {
  id: string;
  title: string;
  brief: string;
  items: PrestartItem[];
}

export const PRESTART_SCENARIOS: PrestartScenario[] = [
  {
    id: 'truck-a',
    title: 'DT-07 · Day shift',
    brief: 'Standard hauler parked in the ready line. Inspect it before your shift.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Tyres & rims', observation: 'Tread even, no cuts, all wheel nuts and indicators aligned.', defect: false, explanation: 'Check for cuts, bulges, low pressure and loose or missing wheel nuts on every wheel.' },
      { id: 'leaks', area: 'walkaround', label: 'Fluid leaks', observation: 'Ground under the truck is dry. No oil or coolant drips.', defect: false, explanation: 'Fresh fluid under the truck points to a hydraulic, oil or coolant leak — find it before starting.' },
      { id: 'lights', area: 'walkaround', label: 'Lights & beacon', observation: 'Headlights, tail lights and the amber beacon all work.', defect: false, explanation: 'The beacon and lights let other operators see you, especially at night and in dust.' },
      { id: 'mirrors', area: 'walkaround', label: 'Mirrors & cameras', observation: 'Mirrors clean and correctly adjusted, camera screen clear.', defect: false, explanation: 'Mirrors and cameras cover the large blind spots around a haul truck.' },
      { id: 'horn', area: 'cab', label: 'Horn', observation: 'Horn sounds loud and clear.', defect: false, explanation: 'The horn signals your intent: one blast before starting, two before moving forward, three before reversing.' },
      { id: 'brakes', area: 'cab', label: 'Service & park brake test', observation: 'Truck holds on the park brake at full throttle test; service brake firm.', defect: false, explanation: 'Brake tests must pass before every shift. Never operate with a failed brake test.' },
      { id: 'seatbelt', area: 'cab', label: 'Seatbelt', observation: 'Buckle latches and the webbing is not frayed.', defect: false, explanation: 'A seatbelt keeps you in the cab’s protective structure if the truck rolls.' },
      { id: 'extinguisher', area: 'safety', label: 'Fire extinguisher', observation: 'Gauge in the green, pin and tamper seal in place.', defect: false, explanation: 'The cab extinguisher is your first line of defence against a fire.' },
    ],
  },
  {
    id: 'truck-b',
    title: 'DT-12 · Night shift',
    brief: 'The previous operator reported “a noise at the back”. Inspect before accepting the truck.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Tyres & rims', observation: 'Deep cut in the left rear outer tyre sidewall, cords visible.', defect: true, critical: true, explanation: 'A sidewall cut with exposed cords can blow out under load. Tag out and call the tyre crew.' },
      { id: 'leaks', area: 'walkaround', label: 'Fluid leaks', observation: 'Small damp patch of hydraulic oil under the hoist cylinder.', defect: true, explanation: 'Report minor leaks so maintenance can fix them before they get worse.' },
      { id: 'lights', area: 'walkaround', label: 'Lights & beacon', observation: 'All lights and the beacon work.', defect: false, explanation: 'The beacon and lights let other operators see you, especially at night and in dust.' },
      { id: 'mirrors', area: 'walkaround', label: 'Mirrors & cameras', observation: 'Mirrors adjusted; camera screen clear.', defect: false, explanation: 'Mirrors and cameras cover the large blind spots around a haul truck.' },
      { id: 'reverse-alarm', area: 'walkaround', label: 'Reversing alarm', observation: 'Alarm beeps when reverse is selected.', defect: false, explanation: 'The reversing alarm warns people and vehicles behind the truck.' },
      { id: 'horn', area: 'cab', label: 'Horn', observation: 'Horn works.', defect: false, explanation: 'The horn signals your intent before starting and moving.' },
      { id: 'seatbelt', area: 'cab', label: 'Seatbelt', observation: 'Latches correctly.', defect: false, explanation: 'A seatbelt keeps you in the cab’s protective structure if the truck rolls.' },
      { id: 'extinguisher', area: 'safety', label: 'Fire extinguisher', observation: 'Gauge in the green, seal intact.', defect: false, explanation: 'The cab extinguisher is your first line of defence against a fire.' },
    ],
  },
  {
    id: 'truck-c',
    title: 'DT-03 · After maintenance',
    brief: 'The truck just came back from the workshop. Do your full pre-start.',
    items: [
      { id: 'tyres', area: 'walkaround', label: 'Tyres & rims', observation: 'Tyres good, wheel-nut indicators aligned.', defect: false, explanation: 'Check for cuts, bulges, low pressure and loose wheel nuts on every wheel.' },
      { id: 'lights', area: 'walkaround', label: 'Lights & beacon', observation: 'Right tail light lens cracked but the light still works.', defect: true, explanation: 'Report cosmetic damage so it is repaired; a working light with a cracked lens does not stop the shift.' },
      { id: 'reverse-alarm', area: 'walkaround', label: 'Reversing alarm', observation: 'No sound when reverse is selected.', defect: true, critical: true, explanation: 'A silent reversing alarm puts people behind the truck at risk. Do not operate until fixed.' },
      { id: 'mirrors', area: 'walkaround', label: 'Mirrors & cameras', observation: 'Mirrors clean and adjusted.', defect: false, explanation: 'Mirrors and cameras cover the large blind spots around a haul truck.' },
      { id: 'brakes', area: 'cab', label: 'Service & park brake test', observation: 'Brake test passed.', defect: false, explanation: 'Brake tests must pass before every shift.' },
      { id: 'horn', area: 'cab', label: 'Horn', observation: 'Horn works.', defect: false, explanation: 'The horn signals your intent before starting and moving.' },
      { id: 'seatbelt', area: 'cab', label: 'Seatbelt', observation: 'Webbing frayed along one edge.', defect: true, critical: true, explanation: 'A damaged seatbelt may fail in a rollover. The truck must not operate until it is replaced.' },
      { id: 'extinguisher', area: 'safety', label: 'Fire extinguisher', observation: 'Bracket empty — extinguisher missing after maintenance.', defect: true, critical: true, explanation: 'Never operate without a charged extinguisher in the cab.' },
    ],
  },
];

export function getPrestartScenario(id: string): PrestartScenario | undefined {
  return PRESTART_SCENARIOS.find((s) => s.id === id);
}

export function correctDecision(scenario: PrestartScenario): PrestartDecision {
  return scenario.items.some((i) => i.critical) ? 'tag-out' : 'operate';
}

export interface PrestartResult {
  correctItems: number;
  total: number;
  missedCritical: number;
  decisionCorrect: boolean;
  passed: boolean;
}

/** `marks[itemId] = true` means the trainee marked a defect; missing = unanswered. */
export function scorePrestart(
  scenario: PrestartScenario,
  marks: Record<string, boolean | undefined>,
  decision: PrestartDecision | null,
): PrestartResult {
  let correctItems = 0;
  let missedCritical = 0;
  for (const item of scenario.items) {
    const mark = marks[item.id];
    if (mark === item.defect) correctItems += 1;
    else if (item.critical) missedCritical += 1;
  }
  const decisionCorrect = decision === correctDecision(scenario);
  const wrongMinor = scenario.items.length - correctItems - missedCritical;
  return {
    correctItems,
    total: scenario.items.length,
    missedCritical,
    decisionCorrect,
    passed: decisionCorrect && missedCritical === 0 && wrongMinor <= PRESTART_ALLOWED_MISTAKES,
  };
}
