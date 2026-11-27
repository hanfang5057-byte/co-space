import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// Temporary compatibility bridge for releases that stored collaboration data
// separately. Remove this module and its single call site after the migration
// support window ends. The source is retained as a backup.
export function migrateLegacyCollaboration(home, destination) {
  const legacyPath = path.join(home, 'collaboration.sqlite');
  if (!existsSync(legacyPath)) return;
  const migrationId = 'legacy-collaboration-v1';
  const hasMarkers = destination.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='cospace_migrations'").get();
  if (hasMarkers && destination.prepare('SELECT 1 FROM cospace_migrations WHERE id=?').get(migrationId)) return;
  const legacy = new DatabaseSync(legacyPath, { readOnly: true, timeout: 5000 });
  let sourceTransaction = false;
  let targetTransaction = false;
  try {
    // A consistent source snapshot and a single destination transaction keep
    // rows and the completion marker together if the process is interrupted.
    legacy.exec('BEGIN');
    sourceTransaction = true;
    destination.exec('BEGIN IMMEDIATE');
    targetTransaction = true;
    destination.exec('CREATE TABLE IF NOT EXISTS cospace_migrations (id TEXT PRIMARY KEY)');
    if (!destination.prepare('SELECT 1 FROM cospace_migrations WHERE id=?').get(migrationId)) {
      const instructions = legacy.prepare('SELECT scope,content,version,updated_at FROM collaboration_instructions').all();
      const operations = legacy.prepare('SELECT id,fingerprint,result FROM collaboration_operations').all();
      const insertInstruction = destination.prepare('INSERT OR IGNORE INTO collaboration_instructions(scope,content,version,updated_at) VALUES(?,?,?,?)');
      const insertOperation = destination.prepare('INSERT OR IGNORE INTO collaboration_operations(id,fingerprint,result) VALUES(?,?,?)');
      // Data already written to the new database always takes precedence.
      for (const row of instructions) insertInstruction.run(row.scope, row.content, row.version, row.updated_at);
      for (const row of operations) insertOperation.run(row.id, row.fingerprint, row.result);
      destination.prepare('INSERT INTO cospace_migrations(id) VALUES(?)').run(migrationId);
    }
    destination.exec('COMMIT');
    targetTransaction = false;
    legacy.exec('COMMIT');
    sourceTransaction = false;
  } catch (error) {
    if (targetTransaction) { try { destination.exec('ROLLBACK'); } catch {} }
    if (sourceTransaction) { try { legacy.exec('ROLLBACK'); } catch {} }
    throw error;
  } finally {
    legacy.close();
  }
}
