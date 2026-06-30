import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ENV } from './env'

// ATURAN: Gunakan HANYA export ini di seluruh proyek
// DILARANG: console.log() di production code
export const logger = winston.createLogger({
  level: ENV.IS_PRODUCTION ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
})
