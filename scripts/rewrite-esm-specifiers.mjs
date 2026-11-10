import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPLICIT_EXTENSION = /\.(?:js|mjs|cjs|json|node|wasm|css)$/;
const STRING_CLOSERS = { single: "'", double: '"', template: '`' };

const isFile = (file) => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

const keywordEndsAt = (code, index, keyword) => {
  const start = index - keyword.length + 1;

  if (start < 0 || code.slice(start, index + 1) !== keyword) {
    return false;
  }

  const before = start === 0 ? '' : code[start - 1];

  return before === '' || /[^\w$]/.test(before);
};

const maskNonCode = (code) => {
  let out = '';
  let index = 0;
  let state = 'code';

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];

    if (state === 'code' && char === '/' && next === '/') {
      out += '  ';
      index += 2;
      state = 'line';
      continue;
    }

    if (state === 'code' && char === '/' && next === '*') {
      out += '  ';
      index += 2;
      state = 'block';
      continue;
    }

    if (state === 'code' && (char === "'" || char === '"' || char === '`')) {
      out += char;
      index += 1;
      switch (char) {
        case "'":
          state = 'single';
          break;
        case '"':
          state = 'double';
          break;
        default:
          state = 'template';
          break;
      }
      continue;
    }

    if (state === 'line') {
      out += char === '\n' ? '\n' : ' ';
      if (char === '\n') {
        state = 'code';
      }
      index += 1;
      continue;
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        out += '  ';
        index += 2;
        state = 'code';
        continue;
      }

      out += char === '\n' ? '\n' : ' ';
      index += 1;
      continue;
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      const closer = STRING_CLOSERS[state];

      if (char === '\\') {
        out += char;
        out += next ?? '';
        index += next === undefined ? 1 : 2;
        continue;
      }

      out += char;
      if (char === closer) {
        state = 'code';
      }
      index += 1;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
};

const isSpecifierContext = (code, quoteIndex) => {
  let index = quoteIndex - 1;

  while (index >= 0 && /\s/.test(code[index])) {
    index -= 1;
  }

  if (index < 0) {
    return false;
  }

  if (code[index] === '(') {
    return keywordEndsAt(code, index - 1, 'import');
  }

  return keywordEndsAt(code, index, 'from') || keywordEndsAt(code, index, 'import');
};

export const relativeModuleSpecifiers = (code) => {
  const masked = maskNonCode(code);
  const found = [];
  const pattern = /(['"])(\.[^'"]+)\1/g;

  for (const match of masked.matchAll(pattern)) {
    if (match.index === undefined || !isSpecifierContext(masked, match.index)) {
      continue;
    }

    found.push({
      specifier: match[2],
      start: match.index,
      length: match[0].length,
      quote: match[1],
    });
  }

  return found;
};

export const resolveRelativeSpecifier = (fromFile, specifier) => {
  if (!specifier.startsWith('.')) {
    return specifier;
  }

  if (EXPLICIT_EXTENSION.test(specifier)) {
    return specifier;
  }

  const normalized = specifier.replace(/\/+$/, '');
  const target = path.resolve(path.dirname(fromFile), normalized);
  const fileTarget = `${target}.js`;

  if (isFile(fileTarget)) {
    return `${normalized}.js`;
  }

  if (isFile(path.join(target, 'index.js'))) {
    return `${normalized}/index.js`;
  }

  throw new Error(`Missing ESM target for '${specifier}' from ${fromFile}`);
};

export const rewriteModuleSpecifiers = (code, fromFile) => {
  const found = relativeModuleSpecifiers(code);
  let next = code;

  for (const item of [...found].reverse()) {
    const rewritten = resolveRelativeSpecifier(fromFile, item.specifier);

    if (rewritten === item.specifier) {
      continue;
    }

    const prefix = next.slice(0, item.start);
    const suffix = next.slice(item.start + item.length);
    next = `${prefix}${item.quote}${rewritten}${item.quote}${suffix}`;
  }

  return next;
};

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);

    return entry.isDirectory() ? walk(file) : [file];
  });

export const rewriteEsmTree = (directory) => {
  const root = path.resolve(directory);
  let changed = 0;

  for (const file of walk(root)) {
    if (!file.endsWith('.js') && !file.endsWith('.d.ts')) {
      continue;
    }

    const source = fs.readFileSync(file, 'utf8');
    const rewritten = rewriteModuleSpecifiers(source, file);

    if (rewritten === source) {
      continue;
    }

    fs.writeFileSync(file, rewritten);
    changed += 1;
  }

  return changed;
};

const entry = process.argv[1];
const isDirectRun =
  entry !== undefined && import.meta.url === pathToFileURL(path.resolve(entry)).href;

if (isDirectRun) {
  const directory = process.argv[2];

  if (!directory) {
    throw new Error('Usage: node scripts/rewrite-esm-specifiers.mjs <lib-directory>');
  }

  const changed = rewriteEsmTree(directory);
  console.log(`esm specifiers: ${changed} files updated in ${path.resolve(directory)}`);
}
