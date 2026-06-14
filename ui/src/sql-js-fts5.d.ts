// sql.js-fts5 is an FTS5-enabled build of sql.js that ships no type declarations;
// borrow the @types/sql.js types (the runtime API is identical).
declare module "sql.js-fts5" {
  export * from "sql.js";
  export { default } from "sql.js";
}
