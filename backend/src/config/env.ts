import { config } from 'dotenv'
config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Environment variable ${key} tidak ditemukan`)
  return value
}

export const ENV = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',
  PORT: parseInt(process.env.PORT ?? '3000'),
  APP_BASE_PATH: process.env.APP_BASE_PATH ?? '/shipping',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const
