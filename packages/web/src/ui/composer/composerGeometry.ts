const COMPOSER_LINE_HEIGHT = 20;
const COMPOSER_MAX_LINES = 5;
const COMPOSER_FIELD_PAD_Y = 7;
const COMPOSER_FIELD_MIN = COMPOSER_LINE_HEIGHT + COMPOSER_FIELD_PAD_Y * 2;
const COMPOSER_FIELD_MAX = COMPOSER_LINE_HEIGHT * COMPOSER_MAX_LINES + COMPOSER_FIELD_PAD_Y * 2;

export const composerGeometry = {
  lineHeight: COMPOSER_LINE_HEIGHT,
  paddingY: COMPOSER_FIELD_PAD_Y,
  minHeight: COMPOSER_FIELD_MIN,
  maxHeight: COMPOSER_FIELD_MAX,
} as const;

export const fitComposerHeight = (element: HTMLTextAreaElement | null) => {
  if (!element) {
    return;
  }

  element.style.height = '0px';
  const content = element.scrollHeight;
  element.style.height = `${Math.min(Math.max(content, COMPOSER_FIELD_MIN), COMPOSER_FIELD_MAX)}px`;
  element.style.overflowY = content > COMPOSER_FIELD_MAX ? 'auto' : 'hidden';
};
