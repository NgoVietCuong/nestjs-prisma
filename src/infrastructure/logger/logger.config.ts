import * as winston from 'winston';
import chalk from 'chalk';
import type { WinstonModuleOptions } from 'nest-winston';
import { getAppConfig } from 'src/config';
import { NodeEnv } from 'src/shared/enums';
import type { LogInfo } from './logger.interface';

export const winstonConfig = (appName: string): WinstonModuleOptions => {
  const { nodeEnv } = getAppConfig();

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ level: true, message: true }),
    winston.format.printf((info) => {
      const log = info as LogInfo;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { level, message, timestamp, context: ctx, error: err, ...metadata } = info;
      // console.log('info', info, err instanceof Error, err);

      const appPrefix = chalk.blue(`[${appName}]`);
      const context = chalk.cyan(`[${log.context || 'Application'}]`);
      if (log.message) {
        return `${appPrefix} - ${log.timestamp}   ${context} ${info.level}: ${log.message}`;
      } else {
        return `${appPrefix} - ${log.timestamp}   ${context} ${info.level}: ${JSON.stringify(info)}`;
      }
    }),
  );

  return {
    transports: [
      // Console transport
      new winston.transports.Console({
        level: nodeEnv === NodeEnv.Production ? 'info' : 'debug',
        format: consoleFormat,
        handleExceptions: true,
      }),
    ],
  };
};
