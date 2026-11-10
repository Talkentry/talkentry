import { TimelineActionType, TimelineChangeKind } from '../../../timeline';
import { aborted } from '../abort';
import { commit, dispatch } from '../commit';
import type { SessionHandle } from '../session-handle';
import { isSessionActive } from '../session-handle';
import { createMutationRequest } from './mutationRequest';
import { MessageMutation, requireMutationTarget } from './mutationTarget';

/**
 * Delete own confirmed message. Requires `capabilities.deleteMessage`.
 * Applies tombstone after server ack (no optimistic remove — tombstones are not revocable).
 */
export const deleteMessage = async (session: SessionHandle, messageId: string): Promise<void> => {
  if (!isSessionActive(session)) {
    throw aborted();
  }

  const adapter = session.options.adapter;

  if (!adapter.capabilities.deleteMessage || !adapter.deleteMessage) {
    throw new Error('ChatAdapter does not support deleteMessage');
  }

  const existing = requireMutationTarget(session, messageId, MessageMutation.Delete);
  const request = createMutationRequest(session);

  try {
    const result = await request.run(
      adapter.deleteMessage({
        chatId: session.options.chatId,
        messageId: existing.id,
        actorId: session.options.currentUserId,
        signal: request.signal,
      }),
    );

    request.assertCurrent();

    session.messageStore.batch(() => {
      session.messageStore.remove(existing.id, result.revision ?? existing.revision);
      commit(session, session.state.messageKeys, TimelineChangeKind.Remove);
    });
  } catch (error) {
    if (request.isCurrent()) {
      dispatch(session, {
        type: TimelineActionType.LoadError,
        error: new Error('Message could not be deleted'),
      });
    }

    if (error instanceof Error && error.message === 'Operation cancelled') {
      throw error;
    }
    throw new Error('Message could not be deleted');
  } finally {
    request.dispose();
  }
};
