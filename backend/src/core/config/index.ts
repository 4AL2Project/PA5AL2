export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  supabase: {
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    url: process.env.SUPABASE_URL || '',
  },
};
