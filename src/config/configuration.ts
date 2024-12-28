import * as env from 'env-var';

export default () => ({
  database: {
    host: env.get('DB_HOST').required().asString(),
    port: env.get('DB_PORT').required().asPortNumber(),
    database: env.get('DB_DATABASE').required().asString(),
    username: env.get('DB_USER').required().asString(),
    password: env.get('DB_PASSWORD').required().asString(),
  },
  ENVIRONMENT: env.get('ENVIRONMENT').asString(),
  DATABASE_URL: env.get('DATABASE_URL').asString(),
});

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
