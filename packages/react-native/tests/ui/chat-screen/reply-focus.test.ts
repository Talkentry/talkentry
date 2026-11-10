import { shouldFocusComposerOnReply } from '../../../src/ui/composer/replyFocus';
import { ComposerDraftType } from '../../../src/ui/composer/types';

describe('shouldFocusComposerOnReply', () => {
  it('opens the keyboard for the first reply', () => {
    expect(shouldFocusComposerOnReply(null)).toBe(true);
    expect(shouldFocusComposerOnReply(undefined)).toBe(true);
  });

  it('keeps the keyboard as-is when the quoted message is swapped', () => {
    expect(shouldFocusComposerOnReply({ type: ComposerDraftType.Reply, messageId: 'a' })).toBe(
      false,
    );
  });

  it('opens the keyboard when leaving an edit draft for a reply', () => {
    expect(
      shouldFocusComposerOnReply({
        type: ComposerDraftType.Edit,
        messageId: 'a',
        text: 'hi',
      }),
    ).toBe(true);
  });
});
