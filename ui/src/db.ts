/** Open the prebuilt papers.db in the browser via sql.js-fts5 (FTS5-enabled).
 *
 * STORY-009 only needs the per-point source to colour the cloud; lazy metadata
 * (STORY-010) and FTS5 search (STORY-011) reuse this handle.
 */

import initSqlJs from "sql.js-fts5";

import type { Source } from "./colors";

/** A read-only handle over the in-browser papers database. */
export interface PapersDb {
  /** Per-point source, ordered by `papers.idx` (aligned with the positions binary). */
  sourcesByIdx(): Source[];
  /** Release the in-memory database. */
  close(): void;
}

/** Open a prebuilt `papers.db` (fetched as bytes); `wasmUrl` locates the sql.js WASM. */
export async function openPapersDb(bytes: Uint8Array, wasmUrl: string): Promise<PapersDb> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database(bytes);
  return {
    sourcesByIdx(): Source[] {
      const stmt = db.prepare("SELECT source FROM papers ORDER BY idx");
      const sources: Source[] = [];
      while (stmt.step()) {
        sources.push(stmt.get()[0] as Source);
      }
      stmt.free();
      return sources;
    },
    close(): void {
      db.close();
    },
  };
}
