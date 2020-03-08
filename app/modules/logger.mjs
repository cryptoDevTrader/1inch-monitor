'use strict';

import winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, timestamp, colorize, printf, splat } = format;
const log_level = process.env.LOG_LEVEL || 'info';

const logger = createLogger({
    level: log_level.toLowerCase(),
    format: combine(
        colorize(),
        timestamp(),
        splat(),
        printf(l => {
            return `${l.timestamp} ${l.level}: ${l.message}`;
        })
    ),
    transports: [new transports.Console()]
  });

  export default logger;