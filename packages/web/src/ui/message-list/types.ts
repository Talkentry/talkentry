import type { Message, User } from '@talkentry/core';
import type { MouseEvent } from 'react';

import type { ChatSlots } from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

export type MessageListProps = {
  readonly locale?: ChatLocale;
  readonly users?: Readonly<Record<string, User>>;
  readonly showScrollToLatest?: boolean;
  readonly showGapMarkers?: boolean;
  readonly isActive?: boolean;
  readonly onContextMenu?: (event: MouseEvent, message: Message) => void;
  readonly onReact?: (message: Message, emoji: string) => void;
  readonly onReply?: (message: Message) => void;
  readonly renderMessage?: ChatSlots['renderMessage'];
  readonly renderMessageBody?: ChatSlots['renderMessageBody'];
  readonly renderGap?: ChatSlots['renderGap'];
  readonly renderDay?: ChatSlots['renderDay'];
  readonly renderEmpty?: ChatSlots['renderEmpty'];
  readonly renderListHeader?: ChatSlots['renderListHeader'];
};
