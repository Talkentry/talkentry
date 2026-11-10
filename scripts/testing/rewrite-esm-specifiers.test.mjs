import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { rewriteModuleSpecifiers } from '../rewrite-esm-specifiers.mjs';

const withFixture = (run) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'talkentry-esm-'));

  try {
    fs.writeFileSync(path.join(directory, 'status.js'), '');
    fs.mkdirSync(path.join(directory, 'theme'));
    fs.writeFileSync(path.join(directory, 'theme', 'index.js'), '');
    fs.writeFileSync(path.join(directory, 'entry.js'), '');
    run(path.join(directory, 'entry.js'));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

describe('rewrite ESM specifiers', () => {
  it('adds file extensions and directory index files', () => {
    withFixture((entry) => {
      const source = [
        "import { a } from './status';",
        "export { b } from './theme';",
        "import './status';",
        "const loaded = import('./theme');",
        "export type { C } from './status';",
      ].join('\n');
      const rewritten = rewriteModuleSpecifiers(source, entry);

      assert.equal(
        rewritten,
        [
          "import { a } from './status.js';",
          "export { b } from './theme/index.js';",
          "import './status.js';",
          "const loaded = import('./theme/index.js');",
          "export type { C } from './status.js';",
        ].join('\n'),
      );
    });
  });

  it('leaves explicit extensions, bare specifiers, comments, and ordinary strings', () => {
    withFixture((entry) => {
      const source = [
        "import { a } from './status.js';",
        "import { b } from 'react';",
        "const label = './status';",
        "// from './status'",
        "/* import './theme' */",
        "const note = 'from ./status';",
      ].join('\n');

      assert.equal(rewriteModuleSpecifiers(source, entry), source);
    });
  });

  it('fails when a relative import has no emitted file', () => {
    withFixture((entry) => {
      assert.throws(
        () => rewriteModuleSpecifiers("import { a } from './missing';", entry),
        /Missing ESM target/,
      );
    });
  });
});
