import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sessionLog } from '../../src/sim/log/pitchLog';
import { runScriptedSession } from '../sessionScript';

const here = dirname(fileURLToPath(import.meta.url));
const SEEDS = ['golden-1', 'golden-2'];

describe('golden pitch logs', () => {
  it.each(SEEDS)('%s reproduces its recorded log byte for byte', (seed) => {
    const json = `${JSON.stringify(sessionLog(runScriptedSession(seed, 30)), null, 2)}\n`;
    const file = join(here, 'logs', `${seed}.json`);
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, json);
      if (!process.env.UPDATE_GOLDEN)
        throw new Error(`Created missing golden log ${file}; review it and rerun.`);
    }
    expect(json).toBe(readFileSync(file, 'utf8'));
  });
});
