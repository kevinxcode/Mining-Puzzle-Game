/**
 * Site Induction — training modules for new team members at a (fictional) open-pit
 * operation. Each module: 2-4 concept cards, a short check, and a campaign level to practice.
 * Content is generic training material, not the procedures of any real site —
 * always follow your own site's rules.
 */

import type { InductionModule } from './types';

export const INDUCTION_MODULES: InductionModule[] = [
  {
    id: 'haul-cycle',
    number: 1,
    title: 'The Haul Cycle',
    summary: 'Load, haul, dump, return — the loop that moves every tonne.',
    icon: 'cycle',
    practiceLevelId: '1',
    practiceNote: 'Send one truck around the full cycle and watch each stage.',
    cards: [
      {
        id: 'cycle-stages',
        title: 'Four stages, one loop',
        body: 'Every truck repeats the same loop: it is LOADED by the excavator, HAULS the material along the road, DUMPS it at the dump point, then RETURNS empty for the next load.',
        art: 'diagram-cycle',
        keyPoint: 'Load → Haul → Dump → Return.',
      },
      {
        id: 'cycle-time',
        title: 'Cycle time',
        body: 'Cycle time is how long one full loop takes. Shorter cycles mean more trips per shift. Waiting, detours and slow roads all make the cycle longer.',
        art: 'icon-timer',
        keyPoint: 'More trips per shift = more tonnes moved.',
      },
      {
        id: 'cycle-payload',
        title: 'Payload',
        body: 'Payload is the weight a truck carries on one trip. Production is simply payload × trips. A full, correctly loaded truck on a short cycle is the goal.',
        art: 'icon-payload',
      },
    ],
    questions: [
      {
        id: 'hc-q1',
        prompt: 'What is the correct order of the haul cycle?',
        options: [
          { id: 'a', text: 'Haul → Load → Return → Dump', correct: false },
          { id: 'b', text: 'Load → Haul → Dump → Return', correct: true },
          { id: 'c', text: 'Dump → Load → Haul → Return', correct: false },
        ],
        explanation: 'A truck is loaded at the face, hauls to the dump point, dumps, then returns empty.',
      },
      {
        id: 'hc-q2',
        prompt: 'Cycle time is…',
        options: [
          { id: 'a', text: 'The time to load one bucket', correct: false },
          { id: 'b', text: 'The length of the whole shift', correct: false },
          { id: 'c', text: 'The time for one complete load-haul-dump-return loop', correct: true },
        ],
        explanation: 'Cycle time covers the full loop, including any waiting along the way.',
      },
      {
        id: 'hc-q3',
        prompt: 'Which change moves more tonnes in the same shift?',
        options: [
          { id: 'a', text: 'Shortening the cycle time', correct: true },
          { id: 'b', text: 'Adding a longer detour', correct: false },
          { id: 'c', text: 'Sending trucks half full', correct: false },
        ],
        explanation: 'Production = payload × trips. A shorter cycle gives more trips.',
      },
    ],
  },
  {
    id: 'bucket-passes',
    number: 2,
    title: 'Bucket Passes & Truck Matching',
    summary: 'Match truck size to the excavator so every load is full and fast.',
    icon: 'bucket',
    practiceLevelId: '6',
    practiceNote: 'Two trucks of different sizes share one excavator — compare their loading.',
    cards: [
      {
        id: 'passes-what',
        title: 'What is a bucket pass?',
        body: 'Each scoop the excavator drops into a truck is one pass. A truck needs several passes to fill. Fewer, fuller passes load a truck faster.',
        art: 'diagram-passes',
        keyPoint: 'Passes to fill = truck payload ÷ bucket size.',
      },
      {
        id: 'passes-match',
        title: 'Match trucks to the loader',
        body: 'A good match fills the truck in a whole number of passes (for example 4). A poor match leaves a last half-empty pass, or a truck so small the excavator waits between trucks.',
        art: 'icon-match',
      },
      {
        id: 'passes-overload',
        title: 'Never overload',
        body: 'Loading past the rated payload strains tyres, brakes and the road, and can spill material. Stop at the rated payload, even if there is room.',
        art: 'icon-warning',
        keyPoint: 'Full is good. Overloaded is unsafe.',
      },
    ],
    questions: [
      {
        id: 'bp-q1',
        prompt: 'A truck carries 60 t and the bucket holds 15 t. How many passes to fill it?',
        options: [
          { id: 'a', text: '3 passes', correct: false },
          { id: 'b', text: '4 passes', correct: true },
          { id: 'c', text: '6 passes', correct: false },
        ],
        explanation: '60 ÷ 15 = 4 full passes — a well-matched truck.',
      },
      {
        id: 'bp-q2',
        prompt: 'There is still space in the tray, but the truck has reached its rated payload. What should happen?',
        options: [
          { id: 'a', text: 'Add one more pass to use the space', correct: false },
          { id: 'b', text: 'Stop loading and send the truck', correct: true },
        ],
        explanation: 'Rated payload is the limit. Overloading is a safety and equipment risk.',
      },
    ],
  },
  {
    id: 'queueing',
    number: 3,
    title: 'Queues & Idle Time',
    summary: 'Waiting trucks cost time and fuel. Spread the fleet to keep it moving.',
    icon: 'queue',
    practiceLevelId: '13',
    practiceNote: 'Two excavators, two trucks — split them so nobody waits in line.',
    cards: [
      {
        id: 'queue-what',
        title: 'Queues form at the loader',
        body: 'An excavator can only load one truck at a time. If trucks arrive faster than it can load them, the others wait in a queue.',
        art: 'diagram-queue',
      },
      {
        id: 'queue-cost',
        title: 'Idle time is lost time',
        body: 'A truck waiting in line burns fuel and moves nothing. Utilization — the share of time a machine is working — drops.',
        art: 'icon-idle',
        keyPoint: 'Watch the queue time. High queue = too many trucks on one loader.',
      },
      {
        id: 'queue-balance',
        title: 'Balance the fleet',
        body: 'When one loader has a queue and another is waiting for trucks, move a truck across. The best plan keeps both excavators and trucks busy.',
        art: 'icon-balance',
      },
    ],
    questions: [
      {
        id: 'q-q1',
        prompt: 'Three trucks are queuing at Excavator A while Excavator B has none. What is the best move?',
        options: [
          { id: 'a', text: 'Reassign a truck to Excavator B', correct: true },
          { id: 'b', text: 'Add another truck to Excavator A', correct: false },
          { id: 'c', text: 'Do nothing — queues are normal', correct: false },
        ],
        explanation: 'Moving a truck to the idle loader cuts queue time and raises production.',
      },
      {
        id: 'q-q2',
        prompt: 'A truck waiting in a queue with its engine running is…',
        options: [
          { id: 'a', text: 'Productive time', correct: false },
          { id: 'b', text: 'Idle time that burns fuel', correct: true },
        ],
        explanation: 'Waiting moves no material but still uses fuel.',
      },
      {
        id: 'q-q3',
        prompt: 'Utilization means…',
        options: [
          { id: 'a', text: 'How fast a truck can drive', correct: false },
          { id: 'b', text: 'How much fuel a truck holds', correct: false },
          { id: 'c', text: 'The share of time equipment is actually working', correct: true },
        ],
        explanation: 'Higher utilization means less waiting and more work done.',
      },
    ],
  },
  {
    id: 'routes',
    number: 4,
    title: 'Route Choice & Traffic',
    summary: 'The shortest road is not always the fastest. Plan around traffic.',
    icon: 'route',
    practiceLevelId: '11',
    practiceNote: 'Try each route and compare the trip time.',
    cards: [
      {
        id: 'routes-choice',
        title: 'Short vs. fast',
        body: 'A short road with a steep ramp, mud or heavy traffic can be slower than a longer, clear road. Choose the route with the best total trip time.',
        art: 'diagram-routes',
        keyPoint: 'Judge a route by time, not distance.',
      },
      {
        id: 'routes-traffic',
        title: 'Intersections and traffic',
        body: 'Where haul roads cross, trucks must slow down and give way. Too many trucks on one road create jams. Spreading traffic keeps everyone moving.',
        art: 'icon-traffic',
      },
    ],
    questions: [
      {
        id: 'r-q1',
        prompt: 'Route A is shorter but muddy and busy. Route B is longer but clear. Which is usually better?',
        options: [
          { id: 'a', text: 'Always Route A — it is shorter', correct: false },
          { id: 'b', text: 'The route with the shorter total trip time, often B', correct: true },
        ],
        explanation: 'Mud and traffic slow trucks down. Total time matters most.',
      },
      {
        id: 'r-q2',
        prompt: 'What causes traffic jams on haul roads?',
        options: [
          { id: 'a', text: 'Too many trucks sharing one road or crossing', correct: true },
          { id: 'b', text: 'Trucks that are fully loaded', correct: false },
          { id: 'c', text: 'Using more than one route', correct: false },
        ],
        explanation: 'Crowded roads and busy intersections force trucks to wait.',
      },
    ],
  },
  {
    id: 'fuel',
    number: 5,
    title: 'Fuel Planning',
    summary: 'Refuel on your terms, not when the tank runs dry on the ramp.',
    icon: 'fuel',
    practiceLevelId: '21',
    practiceNote: 'Watch fuel levels and send trucks to the fuel bay before they run low.',
    cards: [
      {
        id: 'fuel-burn',
        title: 'Every trip burns fuel',
        body: 'Loaded trucks, uphill ramps and long idling burn the most fuel. A truck that runs out stops where it is and blocks the road.',
        art: 'diagram-fuel',
      },
      {
        id: 'fuel-plan',
        title: 'Plan refuels',
        body: 'Send trucks to refuel when they are empty and near the fuel bay, and stagger them so the whole fleet does not stop at once.',
        art: 'icon-plan',
        keyPoint: 'Refuel early, empty and one at a time.',
      },
    ],
    questions: [
      {
        id: 'f-q1',
        prompt: 'When is the best time to send a truck to refuel?',
        options: [
          { id: 'a', text: 'When it is empty, low on fuel and near the fuel bay', correct: true },
          { id: 'b', text: 'Only after the tank is completely empty', correct: false },
          { id: 'c', text: 'Send every truck at the same time', correct: false },
        ],
        explanation: 'Planned, staggered refuels keep production running.',
      },
      {
        id: 'f-q2',
        prompt: 'Which uses the MOST fuel?',
        options: [
          { id: 'a', text: 'An empty truck on flat road', correct: false },
          { id: 'b', text: 'A loaded truck climbing a ramp', correct: true },
        ],
        explanation: 'Weight and grade both increase fuel burn.',
      },
    ],
  },
  {
    id: 'safety',
    number: 6,
    title: 'Site Safety Basics',
    summary: 'Right of way, speed, narrow roads, breakdowns and pre-start checks.',
    icon: 'safety',
    practiceLevelId: '33',
    practiceNote: 'A truck will break down — react calmly and reroute the others.',
    cards: [
      {
        id: 'safety-row',
        title: 'Loaded trucks have right of way',
        body: 'A loaded haul truck is very heavy and needs a long distance to stop. Light vehicles and empty trucks give way to loaded trucks, especially on ramps.',
        art: 'diagram-right-of-way',
        keyPoint: 'When in doubt, give way to the loaded truck.',
      },
      {
        id: 'safety-speed',
        title: 'Speed limits and narrow roads',
        body: 'Obey posted speed limits — they reflect grade, visibility and road condition. On one-way or single-lane sections, follow the signs and wait for the road to clear before entering.',
        art: 'icon-speed',
      },
      {
        id: 'safety-breakdown',
        title: 'Breakdowns: stop, secure, report',
        body: 'If a truck breaks down, stop in a safe spot, apply the park brake, turn on hazard lights and radio it in. Other drivers slow down and follow instructions to pass or reroute.',
        art: 'icon-breakdown',
        keyPoint: 'Never try to push past a broken-down truck without clearance.',
      },
      {
        id: 'safety-prestart',
        title: 'Pre-start checks',
        body: 'Before every shift, walk around the machine: tyres, lights, horn, brakes, mirrors, leaks and fluid levels. Report any fault before operating.',
        art: 'icon-checklist',
      },
    ],
    questions: [
      {
        id: 's-q1',
        prompt: 'A loaded haul truck and a light vehicle meet on a ramp. Who gives way?',
        options: [
          { id: 'a', text: 'The loaded haul truck', correct: false },
          { id: 'b', text: 'The light vehicle', correct: true },
        ],
        explanation: 'Loaded trucks have right of way — they cannot stop quickly.',
      },
      {
        id: 's-q2',
        prompt: 'Your truck breaks down on the haul road. What do you do first?',
        options: [
          { id: 'a', text: 'Stop safely, secure the truck, turn on hazards and radio it in', correct: true },
          { id: 'b', text: 'Walk to the workshop to get help', correct: false },
          { id: 'c', text: 'Keep driving slowly to the dump', correct: false },
        ],
        explanation: 'Stop, secure and report so others can manage traffic safely.',
      },
      {
        id: 's-q3',
        prompt: 'When should pre-start checks be done?',
        options: [
          { id: 'a', text: 'Once a week', correct: false },
          { id: 'b', text: 'Only if something sounds wrong', correct: false },
          { id: 'c', text: 'Before operating, at the start of every shift', correct: true },
        ],
        explanation: 'Pre-start checks catch faults before they become incidents.',
      },
    ],
  },
];

export const INDUCTION_MODULE_IDS: readonly string[] = INDUCTION_MODULES.map((m) => m.id);

export function getInductionModule(id: string): InductionModule | undefined {
  return INDUCTION_MODULES.find((m) => m.id === id);
}
