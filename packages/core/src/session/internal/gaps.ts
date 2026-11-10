import type { MessagePage } from '../../core/pagination';
import {
  continuityGap,
  gapsFromSequences,
  mergeGaps,
  retainGaps,
  type TimelineGap,
  TimelineLoadMode,
  toTimelineGap,
} from '../../timeline';
import type { SessionHandle } from './session-handle';

type LoadMode = (typeof TimelineLoadMode)[keyof typeof TimelineLoadMode];

/**
 * Page-reported + sequence-inferred holes. On older/newer merge, also mark an
 * edge gap when the glued pages are not contiguous — never silent glue.
 */
export const resolveGaps = (
  session: SessionHandle,
  mode: LoadMode,
  page: MessagePage,
  keys: readonly string[],
): TimelineGap[] => {
  const pageGaps = [...(page.gaps ?? []).map(toTimelineGap), ...gapsFromSequences(page.messages)];
  const navigation = mode !== TimelineLoadMode.Older && mode !== TimelineLoadMode.Newer;

  if (navigation) {
    return mergeGaps(pageGaps);
  }

  const edge: TimelineGap[] = [];

  if (mode === TimelineLoadMode.Older && session.state.oldestId) {
    const windowOldest = session.messageStore.get(session.state.oldestId);
    const pageNewest = page.messages[page.messages.length - 1];

    if (windowOldest && pageNewest) {
      const gap = continuityGap(pageNewest, windowOldest);
      if (gap) {
        edge.push(gap);
      }
    }
  }

  if (mode === TimelineLoadMode.Newer && session.state.newestId) {
    const windowNewest = session.messageStore.get(session.state.newestId);
    const pageOldest = page.messages[0];

    if (windowNewest && pageOldest) {
      const gap = continuityGap(windowNewest, pageOldest);
      if (gap) {
        edge.push(gap);
      }
    }
  }

  const ids = new Set<string>();

  for (const candidate of keys) {
    const message = session.messageStore.get(candidate);
    if (message) {
      ids.add(message.id);
    }
  }

  return retainGaps(mergeGaps(session.state.gaps, pageGaps, edge), ids);
};
