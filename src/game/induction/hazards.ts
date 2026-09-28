/**
 * Site Induction — hazard spotting scenes.
 * Each scene is drawn by HazardSceneArt (by id); this file holds the hotspots and
 * the teaching text. Coordinates are scene units (SCENE_WIDTH × SCENE_HEIGHT).
 */

import type { Point } from '@/types/game';

export const SCENE_WIDTH = 100;
export const SCENE_HEIGHT = 130;
/** Wrong taps allowed while still passing a scene. */
export const HAZARD_MAX_MISSES = 3;

export interface Hazard {
  id: string;
  /** Hotspot centre and radius in scene units. */
  x: number;
  y: number;
  r: number;
  title: string;
  explanation: string;
}

export interface HazardScene {
  id: string;
  title: string;
  brief: string;
  hazards: Hazard[];
}

export const HAZARD_SCENES: HazardScene[] = [
  {
    id: 'loading-area',
    title: 'Loading Area',
    brief: 'An excavator is loading a haul truck at the pit face. Find 4 hazards.',
    hazards: [
      {
        id: 'swing-zone',
        x: 30,
        y: 44,
        r: 9,
        title: 'Person inside the swing radius',
        explanation:
          'Never walk inside an excavator’s swing radius. The operator may not see you and the counterweight swings behind the cab.',
      },
      {
        id: 'blind-spot',
        x: 80,
        y: 90,
        r: 9,
        title: 'Light vehicle in the truck’s blind spot',
        explanation:
          'Haul truck drivers cannot see small vehicles close behind or beside the truck. Park well clear and make positive radio contact first.',
      },
      {
        id: 'no-berm',
        x: 12,
        y: 104,
        r: 9,
        title: 'No safety berm at the bench edge',
        explanation:
          'Every edge a vehicle can reach needs a windrow (berm) at least half the height of the largest wheel to stop vehicles going over.',
      },
      {
        id: 'loose-rock',
        x: 58,
        y: 118,
        r: 8,
        title: 'Spilled rock on the haul road',
        explanation:
          'Spillage damages tyres and can cause loss of control. Report it and have it cleared before trucks pass at speed.',
      },
    ],
  },
  {
    id: 'haul-road',
    title: 'Haul Road',
    brief: 'A busy haul road on the ramp out of the pit. Find 4 hazards.',
    hazards: [
      {
        id: 'pedestrian',
        x: 72,
        y: 32,
        r: 8,
        title: 'Pedestrian on the haul road',
        explanation:
          'Haul roads are for vehicles only. People on foot must use a designated walkway or be escorted in a vehicle.',
      },
      {
        id: 'wrong-way',
        x: 30,
        y: 70,
        r: 9,
        title: 'Truck driving against the one-way sign',
        explanation:
          'Narrow sections are one-way for a reason: two haul trucks cannot pass. Follow the site traffic management plan.',
      },
      {
        id: 'unmarked-breakdown',
        x: 20,
        y: 108,
        r: 9,
        title: 'Broken-down truck without warning',
        explanation:
          'A stopped vehicle must be made visible: hazard lights, cones or triangles, and a radio call to the dispatcher.',
      },
      {
        id: 'curve-berm',
        x: 88,
        y: 44,
        r: 8,
        title: 'Gap in the berm on a curve',
        explanation:
          'Curves are where trucks run wide. A missing section of windrow must be repaired and coned off until it is.',
      },
    ],
  },
  {
    id: 'refuel-bay',
    title: 'Refuelling Bay',
    brief: 'A haul truck is being refuelled at the fuel bay. Find 4 hazards.',
    hazards: [
      {
        id: 'smoking',
        x: 22,
        y: 40,
        r: 8,
        title: 'Smoking near the fuel pump',
        explanation:
          'No smoking or naked flames within the fuel bay. Diesel vapour and spills can ignite.',
      },
      {
        id: 'engine-running',
        x: 72,
        y: 58,
        r: 9,
        title: 'Engine left running while refuelling',
        explanation:
          'Shut the engine down and apply the park brake before refuelling. Hot exhausts and moving parts are ignition sources.',
      },
      {
        id: 'spill',
        x: 48,
        y: 96,
        r: 9,
        title: 'Fuel spill not cleaned up',
        explanation:
          'Contain spills straight away with the spill kit and report them. Spills are a fire, slip and environmental hazard.',
      },
      {
        id: 'no-extinguisher',
        x: 88,
        y: 112,
        r: 8,
        title: 'Empty fire extinguisher bracket',
        explanation:
          'Fuel bays must have a charged extinguisher in place. Report missing or expired extinguishers before work starts.',
      },
    ],
  },
];

export function getHazardScene(id: string): HazardScene | undefined {
  return HAZARD_SCENES.find((s) => s.id === id);
}

export type TapResult = { kind: 'found'; hazardId: string } | { kind: 'repeat'; hazardId: string } | { kind: 'miss' };

export function evaluateTap(scene: HazardScene, foundIds: readonly string[], point: Point): TapResult {
  for (const h of scene.hazards) {
    if (Math.hypot(point.x - h.x, point.y - h.y) <= h.r) {
      return foundIds.includes(h.id) ? { kind: 'repeat', hazardId: h.id } : { kind: 'found', hazardId: h.id };
    }
  }
  return { kind: 'miss' };
}

export function hazardRunPassed(scene: HazardScene, found: number, misses: number): boolean {
  return found >= scene.hazards.length && misses <= HAZARD_MAX_MISSES;
}
