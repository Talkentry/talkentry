import { type Message } from '../../../core/message';
import { assertMessage } from '../../../core/validation';
import { TimelineActionType, TimelineChangeKind } from '../../../timeline';
import { aborted } from '../abort';
import { commit, dispatch } from '../commit';
import type { SessionHandle } from '../session-handle';
import { isSessionActive } from '../session-handle';
import { createMutationRequest } from './mutationRequest';
import { MessageMutation, requireMutationTarget } from './mutationTarget';

/**
 * Edit own message text in place. Requires `capabilities.editMessage`.
 * Optimistic local upsert; server `message.updated` reconciles peers.
 */
export const editMessage = async (
  session: SessionHandle,
  messageId: string,
  text: string,
): Promise<void> => {
  if (!isSessionActive(session)) {
    throw aborted();
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Message is empty');
  }

  const adapter = session.options.adapter;

  if (!adapter.capabilities.editMessage || !adapter.editMessage) {
    throw new Error('ChatAdapter does not support editMessage');
  }

  const existing = requireMutationTarget(session, messageId, MessageMutation.Edit);

  const optimistic: Message = assertMessage(
    {
      ...existing,
      text: trimmed,
      updatedAt: Date.now(),
      revision: (existing.revision ?? 0) + 1,
    },
    session.options.chatId,
  );

  const request = createMutationRequest(session);
  try {
    session.messageStore.batch(() => {
      session.messageStore.upsert(optimistic);
      commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
    });
    const result = await request.run(
      adapter.editMessage({
        chatId: session.options.chatId,
        messageId: existing.id,
        actorId: session.options.currentUserId,
        text: trimmed,
        signal: request.signal,
      }),
    );

    request.assertCurrent();

    const message = assertMessage(result, session.options.chatId);

    session.messageStore.batch(() => {
      session.messageStore.upsert(message);
      commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
    });
  } catch {
    if (request.isCurrent()) {
      session.messageStore.batch(() => {
        session.messageStore.upsert(existing);
        commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
        dispatch(session, {
          type: TimelineActionType.LoadError,
          error: new Error('Message could not be edited'),
        });
      });
    }

    throw new Error('Message could not be edited');
  } finally {
    request.dispose();
  }
};
