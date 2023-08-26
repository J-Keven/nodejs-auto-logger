import ddTracer from 'dd-trace';

import Logger from './logger';
import { ITracingParams } from './types';

let tracerSingleton: any;
/**
 * @requires
 * Required environment variables:
 * - APP_NAME
 * - NODE_ENV
 * - DATADOG_INTEGRATION
 * @description Datadog tracer
 * @example
 * // Import the tracer in server.ts
 * import { tracer } from '@g4/logger';
 * // start the tracer
 * tracer(data: ITracingParams);
 * */
function tracer({
  port = 8126,
  hostname = 'localhost',
  logInjection = true,
  runtimeMetrics = true,
  profiling = true,
}: ITracingParams) {
  const datadogIntegration = Boolean(process.env.DATADOG_INTEGRATION);
  if (datadogIntegration) {
    if (!tracerSingleton) {
      tracerSingleton = ddTracer.init({
        logInjection,
        runtimeMetrics,
        profiling,
        service: process.env.APP_NAME,
        tags: {
          env: process.env.NODE_ENV,
          app: process.env.APP_NAME,
        },
        port,
        hostname,
      });
      const winstonLogger = new Logger().logger;
      tracerSingleton.use('winston', {
        logger: winstonLogger,
      });

      winstonLogger.log(
        'info',
        "Datadog's tracer has been initialized and is ready to use",
      );
    }
  }
}

export default tracer;
