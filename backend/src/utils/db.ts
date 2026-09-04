import { logger } from '../config/logger'

/**
 * Execute raw SQL / async DB query safely, logging errors and returning fallback if failed.
 */
export async function safeRunRaw<T = any>(
  queryFn: () => Promise<T>,
  description: string,
  fallback: T = [] as unknown as T
): Promise<T> {
  try {
    return await queryFn()
  } catch (err) {
    logger.error(`Error executing ${description}:`, err)
    return fallback
  }
}
