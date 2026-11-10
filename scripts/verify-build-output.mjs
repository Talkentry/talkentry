import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { relativeModuleSpecifiers, resolveRelativeSpecifier } from './rewrite-esm-specifiers.mjs';

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });

for (const name of ['core', 'web', 'react-native']) {
  const root = path.resolve('packages', name);
  const sourceRoot = path.join(root, 'src');
  const outputRoot = path.join(root, 'lib', name === 'react-native' ? 'module' : '');
  const sources = walk(sourceRoot).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts'),
  );
  const outputs = walk(outputRoot).filter((file) => file.endsWith('.js'));
  for (const output of outputs) {
    const relative = path.relative(outputRoot, output).replace(/\.js$/, '');
    assert(
      fs.existsSync(path.join(sourceRoot, `${relative}.ts`)) ||
        fs.existsSync(path.join(sourceRoot, `${relative}.tsx`)),
      `Stale output: ${output}`,
    );
  }
  for (const source of sources) {
    const relative = path.relative(sourceRoot, source).replace(/\.(ts|tsx)$/, '.js');
    assert(fs.existsSync(path.join(outputRoot, relative)), `Missing output: ${relative}`);
  }
  for (const declaration of walk(path.join(root, 'lib')).filter((file) => file.endsWith('.d.ts'))) {
    assert(
      !/\bnode_modules[/\\]/.test(fs.readFileSync(declaration, 'utf8')),
      `Non-portable dependency path in declaration: ${declaration}`,
    );
  }
  if (name === 'core' || name === 'web') {
    const emitted = walk(path.join(root, 'lib')).filter(
      (file) => file.endsWith('.js') || file.endsWith('.d.ts'),
    );

    for (const file of emitted) {
      const code = fs.readFileSync(file, 'utf8');

      for (const specifier of relativeModuleSpecifiers(code).map((item) => item.specifier)) {
        assert.equal(
          resolveRelativeSpecifier(file, specifier),
          specifier,
          `Relative import must name an explicit file: ${specifier} in ${file}`,
        );
        assert.equal(
          fs.statSync(path.resolve(path.dirname(file), specifier)).isFile(),
          true,
          `Missing ESM file for ${specifier} in ${file}`,
        );
      }
    }
  }

  console.log(`${name}: ${outputs.length} outputs match ${sources.length} source modules`);
}

const core = await import('@talkentry/core');
const web = await import('@talkentry/web');

assert.equal(typeof core.ChatSession, 'function');
assert.equal(typeof web.Chat, 'function');
assert.equal(typeof web.TalkentryProvider, 'function');
console.log('core and web package entries import from Node');
