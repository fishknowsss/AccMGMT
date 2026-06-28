/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const filterSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-filters.tsx', import.meta.url)),
  'utf8',
);
const operationsSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/operations-strip.tsx', import.meta.url)),
  'utf8',
);

describe('Pixverse board surface', () => {
  it('does not expose renewal filters or renewal metrics', () => {
    expect(filterSource).not.toContain('全部续费');
    expect(filterSource).not.toContain('renewal');
    expect(operationsSource).not.toContain('7天内续费');
    expect(operationsSource).not.toContain('续费');
    expect(operationsSource).not.toContain('renewalSoon');
  });
});
