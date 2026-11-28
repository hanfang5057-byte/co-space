import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

export const DATA_LAYOUT_VERSION = 3;

// Missing markers in older databases are identified by their actual tables.
// Invalid/unreadable databases throw so callers cannot roll back speculatively.
export function readDataLayout(home) {
  const file = path.join(home, 'review.sqlite');
  if (!existsSync(file)) return 1;
  const db = new DatabaseSync(file, { readOnly: true, timeout: 5000 });
  try {
    const hasTable = name => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
    if (hasTable('cospace_data_layout')) {
      const version = db.prepare('SELECT version FROM cospace_data_layout WHERE id=1').get()?.version;
      if (!Number.isInteger(version) || version < 1) throw new Error('Invalid CoSpace data layout marker');
      return version;
    }
    return hasTable('collaboration_instructions') ? 2 : 1;
  } finally { db.close(); }
}
