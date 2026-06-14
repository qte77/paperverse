/** Open the prebuilt papers.db in the browser via sql.js-fts5 (FTS5-enabled).
 *
 * STORY-009 colours points by source; STORY-010 reads one paper's metadata on
 * click; STORY-011 runs the FTS5 search. The handle stays open for the page's life.
 */

import initSqlJs from "sql.js-fts5";

import type { Source } from "./colors";

/** Full metadata for one paper (cold path: fetched lazily on click). */
export interface PaperMeta {
  idx: number;
  uid: string;
  source: Source;
  title: string;
  categories: string[];
  published: string;
  authors: string;
  abstract: string;
  doi: string | null;
}

/** A read-only handle over the in-browser papers database. */
export interface PapersDb {
  /** Per-point source, ordered by `papers.idx` (aligned with the positions binary). */
  sourcesByIdx(): Source[];
  /** Full metadata for one point, or null if the index is unknown. */
  paperByIdx(idx: number): PaperMeta | null;
  /** Point indices matching an FTS5 query, ranked; [] for no match or a bad query. */
  search(query: string): number[];
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
    paperByIdx(idx: number): PaperMeta | null {
      const stmt = db.prepare(
        "SELECT idx, uid, source, title, categories, published, authors, abstract, doi " +
          "FROM papers WHERE idx = ?",
      );
      stmt.bind([idx]);
      if (!stmt.step()) {
        stmt.free();
        return null;
      }
      const row = stmt.getAsObject();
      stmt.free();
      return {
        idx: row.idx as number,
        uid: row.uid as string,
        source: row.source as Source,
        title: row.title as string,
        categories: JSON.parse(row.categories as string) as string[],
        published: row.published as string,
        authors: row.authors as string,
        abstract: row.abstract as string,
        doi: (row.doi as string | null) ?? null,
      };
    },
    search(query: string): number[] {
      const stmt = db.prepare(
        "SELECT rowid AS idx FROM papers_fts WHERE papers_fts MATCH ? ORDER BY rank",
      );
      const indices: number[] = [];
      try {
        stmt.bind([query]);
        while (stmt.step()) {
          indices.push(stmt.get()[0] as number);
        }
      } catch {
        indices.length = 0; // malformed FTS5 query string → no results
      } finally {
        stmt.free();
      }
      return indices;
    },
    close(): void {
      db.close();
    },
  };
}
