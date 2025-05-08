import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from '../config';

// This is the correct way neon config - DO NOT change this
neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: config.databaseUrl });
export const db = drizzle({ client: pool, schema });