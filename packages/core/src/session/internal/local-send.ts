import type { Message } from '../../core/message';
import type { LocalSendAccepted } from '../types';
import { isSessionActive, type SessionHandle } from './session-handle';

export const belongsToThread = (session: SessionHandle, message: Message | undefined): boolean => {
  if (!message) {
    return false;
  }
  if (session.threadId) {
    return message.threadId === session.threadId || message.id === session.threadId;
  }

  return !message.threadId;
};

export const publishLocalSend = (
  session: SessionHandle,
  input: Omit<LocalSendAccepted, 'sequence'>,
): void => {
  const event: LocalSendAccepted = Object.freeze({
    ...input,
    sequence: ++session.localSendSequence,
  });
  const epoch = session.epoch;

  for (const listener of session.localSendListeners) {
    if (!isSessionActive(session) || session.epoch !== epoch) {
      return;
    }
    try {
      listener(event);
    } catch {
      // A presentation callback must not veto an already accepted send.
    }
  }
};
