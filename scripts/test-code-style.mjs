import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: root });
const checks = [
  {
    name: 'braces',
    file: 'packages/core/src/core/commands.ts',
    code: 'export const fn = (value: boolean) => { if (value) return 1; return 0; };',
    rule: 'curly',
  },
  {
    name: 'nested conditionals',
    file: 'packages/core/src/core/commands.ts',
    code: 'export const fn = (a: boolean, b: boolean) => a ? (b ? 1 : 2) : 3;',
    rule: 'no-nested-ternary',
  },
  {
    name: 'native boundary in core',
    file: 'packages/core/src/core/commands.ts',
    code: "import { View } from 'react-native'; export { View };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'native boundary in web',
    file: 'packages/web/src/ui/composer/types.ts',
    code: "import { View } from 'react-native'; export { View };",
    rule: 'no-restricted-imports',
  },
  {
    name: 'unhandled promise',
    file: 'packages/core/src/core/commands.ts',
    code: 'Promise.resolve(1);',
    rule: '@typescript-eslint/no-floating-promises',
  },
  {
    name: 'conditional hook',
    file: 'packages/web/src/ui/composer/ComposerView.tsx',
    code: "import { useState } from 'react'; export const Component = ({ active }: { active: boolean }) => { if (active) { useState(0); } return null; };",
    rule: 'react-hooks/rules-of-hooks',
  },
  {
    name: 'keyboard accessibility',
    file: 'packages/web/src/ui/composer/ComposerView.tsx',
    code: 'export const Component = () => <div onClick={() => undefined}>Action</div>;',
    rule: 'jsx-a11y/click-events-have-key-events',
  },
];

for (const check of checks) {
  const [result] = await eslint.lintText(check.code, { filePath: path.join(root, check.file) });
  assert(
    result.messages.some((message) => message.ruleId === check.rule),
    check.name,
  );
}

const source =
  "import type { Message } from '@talkentry/core';\n\nexport type MessageAlias = Message;\n";
const [valid] = await eslint.lintText(source, {
  filePath: path.join(root, 'packages/web/src/ui/composer/types.ts'),
});
assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
assert.equal(valid.warningCount, 0);

const styleFile = path.join(
  root,
  'packages/react-native/src/ui/message-list/ScrollToLatestButton.tsx',
);
const styleRule = 'talkentry/styles-after-component';
const styleCases = [
  {
    name: 'style object before UI',
    code: 'const styles = { box: {} }; export const Demo = () => <div style={styles.box} />;',
    invalid: true,
  },
  {
    name: 'factory before UI',
    code: 'const createStyles = () => ({ box: {} }); export const Demo = () => <div style={createStyles().box} />;',
    invalid: true,
  },
  {
    name: 'styles between UI declarations',
    code: 'export const First = () => <div />; const styles = {}; export const Last = () => <div style={styles} />;',
    invalid: true,
  },
  {
    name: 'renamed native style factory',
    code: "import { StyleSheet as NativeSheet } from 'react-native'; const makeAppearance = () => NativeSheet.create({ box: {} }); export const Demo = () => <div style={makeAppearance().box} />;",
    invalid: true,
  },
  {
    name: 'native static stylesheet before UI',
    code: "import { StyleSheet } from 'react-native'; const appearance = StyleSheet.create({ box: {} }); export const Demo = () => <div style={appearance.box} />;",
    invalid: true,
  },
  {
    name: 'stylesheet declared inside UI',
    code: "import { StyleSheet } from 'react-native'; export const Demo = () => { const appearance = StyleSheet.create({ box: {} }); return <div style={appearance.box} />; };",
    invalid: true,
  },
  {
    name: 'style literal declared inside UI',
    code: 'export const Demo = () => { const styles = { box: {} }; return <div style={styles.box} />; };',
    invalid: true,
  },
  {
    name: 'only factory invocation inside UI',
    code: 'export const Demo = () => { const styles = createStyles(); return <div style={styles.box} />; }; const createStyles = () => ({ box: {} });',
    invalid: false,
  },
  {
    name: 'styles below UI',
    code: 'export const Demo = () => <div style={styles} />; const styles = {};',
    invalid: false,
  },
  {
    name: 'factory below UI',
    code: 'export const Demo = () => <div style={createStyles()} />; const createStyles = () => ({});',
    invalid: false,
  },
  {
    name: 'imported styles',
    code: "import { createComposerStyles } from '../composer/view/styles'; export const Demo = () => <div data-factory={createComposerStyles.name} />;",
    invalid: false,
  },
];
for (const check of styleCases) {
  const [result] = await eslint.lintText(check.code, { filePath: styleFile });
  assert.equal(
    result.messages.some((message) => message.ruleId === styleRule),
    check.invalid,
    check.name,
  );
}

const fixingEslint = new ESLint({ cwd: root, fix: true });
const [fixed] = await fixingEslint.lintText(styleCases[1].code, { filePath: styleFile });
assert(fixed.output?.indexOf('const createStyles') > fixed.output?.indexOf('export const Demo'));
assert(!fixed.messages.some((message) => message.ruleId === styleRule));
console.log(`Code style: ${checks.length + styleCases.length + 2} configuration checks passed`);
