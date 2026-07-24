import fs from 'node:fs/promises';
import path from 'node:path';

const HISTORY_DIR = process.env.WEATHER_HISTORY_DIR ?? 'data/history/weather';
const RETENTION_DAYS = Number(process.env.WEATHER_RETENTION_DAYS ?? 90);
const DRY_RUN = process.argv.includes('--dry-run');
const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const files = await walk(HISTORY_DIR);
let deleted = 0;
let bytes = 0;
for (const file of files) {
  const stat = await fs.stat(file);
  if (stat.mtimeMs >= cutoff) continue;
  bytes += stat.size;
  deleted += 1;
  if (!DRY_RUN) await fs.unlink(file);
}

console.log(JSON.stringify({
  historyDir: HISTORY_DIR,
  retentionDays: RETENTION_DAYS,
  dryRun: DRY_RUN,
  deletedFiles: deleted,
  freedBytes: bytes
}, null, 2));
