import { END_POSITION_TOLERANCE_PX } from '@talkentry/core';

type Command = {
  readonly id: number;
  readonly offset: number;
  readonly keys: readonly string[];
  readonly animated: boolean;
};

const reached = (position: number, target: number) =>
  Math.abs(position - target) <= END_POSITION_TOLERANCE_PX;

/** Mechanical execution only. The viewport remains the owner of scroll policy.
 * Keep one native animation, not one queued animation per incoming message. */
export const createScrollCommand = () => {
  let applied: Command | null = null;
  let active: Command | null = null;
  let exhausted = false;
  let attempts = { id: -1, offset: 0, position: 0, count: 0 };

  return {
    get applied() {
      return applied;
    },
    get active() {
      return active !== null;
    },
    get exhausted() {
      return exhausted;
    },
    observe: (position: number) => {
      if (active && reached(position, active.offset)) {
        active = null;
      }
    },
    request: (command: Command, position: number, retry = false): boolean => {
      exhausted = false;
      if (active?.id !== command.id) {
        active = null;
      }
      if (active && !reached(position, active.offset)) {
        return false;
      }
      active = null;

      if (reached(position, command.offset)) {
        applied = command;

        return false;
      }
      if (
        !retry &&
        applied?.id === command.id &&
        applied.keys === command.keys &&
        reached(applied.offset, command.offset)
      ) {
        return false;
      }

      // A non-responsive native list must not create an endless retry loop.
      // Actual progress, a new destination or a new intent admits a fresh budget.
      if (
        attempts.id !== command.id ||
        !reached(attempts.offset, command.offset) ||
        !reached(attempts.position, position)
      ) {
        attempts = { id: command.id, offset: command.offset, position, count: 0 };
      }
      if (attempts.count >= 3) {
        exhausted = true;

        return false;
      }
      attempts.count += 1;
      applied = command;
      if (command.animated) {
        active = command;
      }

      return true;
    },
    release: () => {
      active = null;
    },
    cancel: () => {
      applied = null;
      active = null;
      attempts.count = 0;
      exhausted = false;
    },
  };
};
