import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({
  path: join(process.cwd(), '../../.env'),
});
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@db/src/drizzle/schemas';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, {
  schema,
});
