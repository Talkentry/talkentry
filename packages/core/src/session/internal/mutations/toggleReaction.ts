import { assertMessage } from '../../../core/validation';
import { TimelineChangeKind } from '../../../timeline';
import { aborted } from '../abort';
import { commit } from '../commit';
import type { SessionHandle } from '../session-handle';
import { isSessionActive } from '../session-handle';
import { createMutationRequest } from './mutationRequest';
import { MessageMutation, requireMutationTarget } from './mutationTarget';

/**
 * Toggle an emoji reaction. Requires `capabilities.reactions`.
 * Server returns the full message; peers get `message.updated`.
 */
export const toggleReaction = async (
  session: SessionHandle,
  messageId: string,
  emoji: string,
): Promise<void> => {
  if (!isSessionActive(session)) {
    throw aborted();
  }

  const adapter = session.options.adapter;

  if (!adapter.capabilities.reactions || !adapter.toggleReaction) {
    throw new Error('ChatAdapter does not support reactions');
  }

  const existing = requireMutationTarget(session, messageId, MessageMutation.React);
  const request = createMutationRequest(session);

  try {
    const result = await request.run(
      adapter.toggleReaction({
        chatId: session.options.chatId,
        messageId: existing.id,
        actorId: session.options.currentUserId,
        emoji,
        signal: request.signal,
      }),
    );

    request.assertCurrent();

    const message = assertMessage(result, session.options.chatId);

    session.messageStore.batch(() => {
      // Upsert merges omitted fields from the old version; a missing list must clear the last chip.
      session.messageStore.upsert({ ...message, reactions: message.reactions ?? [] });
      commit(session, session.state.messageKeys, TimelineChangeKind.Reconcile);
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Operation cancelled') {
      throw error;
    }
    throw new Error('Reaction could not be updated');
  } finally {
    request.dispose();
  }
};
