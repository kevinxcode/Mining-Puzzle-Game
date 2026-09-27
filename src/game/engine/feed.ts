/**
 * MINING FLOW — event feed helper.
 * Small shared utility used by every engine module to push messages.
 */

import type { SimState } from '@/types/game';
import { balance } from '../config/balance';

export function pushFeed(state: SimState, message: string): void {
  state.eventFeed.unshift({
    id: `feed-${state.eventFeed.length}-${message}`,
    message,
    time: state.elapsed,
  });
  if (state.eventFeed.length > balance.eventFeedMax) {
    state.eventFeed.pop();
  }
}