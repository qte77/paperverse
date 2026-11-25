// sql.js-fts5 is an FTS5-enabled build of sql.js 1.4.0 that ships no type declarations;
// borrow the @types/sql.js types, pinned to 1.4.x so they describe the same API.
declare module "sql.js-fts5" {
  export * from "sql.js";
  export { default } from "sql.js";
}
