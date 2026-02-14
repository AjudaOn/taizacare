declare module "better-sqlite3" {
  type Primitive = string | number | boolean | null | undefined;

  export type RunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export type Statement = {
    run(...params: any[]): RunResult;
    get<T = any>(...params: any[]): T;
    all<T = any>(...params: any[]): T[];
  };

  export type Database = {
    pragma(value: string): unknown;
    exec(sql: string): void;
    prepare(sql: string): Statement;
  };

  const DatabaseCtor: new (filename: string) => Database;
  export default DatabaseCtor;
}
