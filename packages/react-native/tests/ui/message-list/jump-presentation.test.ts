import type { FlashListRef } from '@shopify/flash-list';

import { readListLayout } from '../../../src/ui/message-list/readListLayout';

describe('native jump layout', () => {
  it('treats a transient throwing native layout as unavailable rather than a renderer crash', () => {
    const list = {
      getLayout: () => {
        throw new Error('not initialized');
      },
    } as unknown as FlashListRef<string>;
    expect(readListLayout(list, 99)).toBeUndefined();
  });
});
