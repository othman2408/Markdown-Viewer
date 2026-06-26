declare module "bun" {
  export type SQLValue = unknown;

  export interface SQLConfig {
    connectionTimeout?: number;
    idleTimeout?: number;
    max?: number;
    url?: string;
  }

  export interface SQL {
    <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: SQLValue[]): Promise<T[]>;
    array(values: SQLValue[]): SQLValue;
    begin<T>(callback: (transaction: SQL) => Promise<T> | T): Promise<T>;
    close(): Promise<void>;
    unsafe<T = Record<string, unknown>>(query: string, values?: SQLValue[]): Promise<T[]>;
  }

  export const SQL: {
    new (config?: string | SQLConfig): SQL;
  };
}
