import type { RowDataPacket } from "mysql2";
import { createConnection, createPool, type Pool, type PoolOptions } from "mysql2/promise";

const replayTables = ["matches", "players", "actions", "records_game_init", "records_unit_build", "data_units", "data_heroes"];

let poolPromise: Promise<Pool | null> | null = null;

export async function getDatabasePool() {
  poolPromise ??= createDatabasePool();
  return poolPromise;
}

async function createDatabasePool() {
  const config = await resolveDatabaseConfig();

  if (!config) {
    return null;
  }

  return createPool({
    ...config,
    connectionLimit: 6,
    dateStrings: true,
    namedPlaceholders: false,
    waitForConnections: true
  });
}

async function resolveDatabaseConfig(): Promise<PoolOptions | null> {
  const url = process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? process.env.MARIADB_URL;

  if (url) {
    return { uri: url, ...sslConfig() };
  }

  const explicit = explicitConfig();
  if (explicit) {
    return explicit;
  }

  return discoverLocalConfig();
}

function explicitConfig(): PoolOptions | null {
  const database =
    process.env.DB_NAME ??
    process.env.MYSQL_DATABASE ??
    process.env.MYSQL_DB ??
    process.env.MARIADB_DATABASE ??
    process.env.MARIADB_DB;
  const host = process.env.DB_HOST ?? process.env.MYSQL_HOST ?? process.env.MARIADB_HOST;
  const user = process.env.DB_USER ?? process.env.MYSQL_USER ?? process.env.MARIADB_USER;
  const password = process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? process.env.MARIADB_PASSWORD;
  const portValue = process.env.DB_PORT ?? process.env.MYSQL_PORT ?? process.env.MARIADB_PORT;

  if (!database && !host && !user && !password && !portValue) {
    return null;
  }

  return {
    database,
    host: host ?? "127.0.0.1",
    password,
    port: portValue ? Number(portValue) : 3306,
    user: user ?? "root",
    ...sslConfig()
  };
}

function sslConfig(): Partial<PoolOptions> {
  const sslMode = process.env.DB_SSL ?? process.env.MYSQL_SSL ?? process.env.MARIADB_SSL;

  if (sslMode === "0" || sslMode === "false") {
    return {};
  }

  if (sslMode) {
    return { ssl: {} };
  }

  return {};
}

async function discoverLocalConfig(): Promise<PoolOptions | null> {
  try {
    const connection = await createConnection({
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      dateStrings: true
    });

    try {
      const placeholders = replayTables.map(() => "?").join(",");
      const [rows] = await connection.query<Array<RowDataPacket & { tableSchema: string }>>(
        `SELECT table_schema AS tableSchema
         FROM information_schema.tables
         WHERE table_name IN (${placeholders})
         GROUP BY table_schema
         HAVING COUNT(DISTINCT table_name) = ?
         ORDER BY
           table_schema LIKE '%legion%' DESC,
           table_schema LIKE '%oze%' DESC,
           table_schema LIKE '%replay%' DESC,
           table_schema`,
        [...replayTables, replayTables.length]
      );
      const database = rows[0]?.tableSchema;

      if (!database) {
        return null;
      }

      return {
        database,
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: ""
      };
    } finally {
      await connection.end();
    }
  } catch {
    return null;
  }
}
