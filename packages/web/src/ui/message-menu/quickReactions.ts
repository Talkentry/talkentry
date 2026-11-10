import type { Message } from '@talkentry/core';

/** Default Telegram-style shortcuts at the top of the context menu. */
export const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🥰', '👏', '😁'] as const;

export const ownReactionEmoji = (message: Message, userId: string): string | null => {
  const reactions = message.reactions;
  if (!reactions) {
    return null;
  }

  for (const reaction of reactions) {
    if (reaction.userIds.includes(userId)) {
      return reaction.emoji;
    }
  }

  return null;
};
