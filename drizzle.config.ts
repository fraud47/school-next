import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:619619@localhost:5432/school_db',
  },
  tablesFilter: ['!pg_stat_monitor*', '!pg_stat_statements*'],
});
