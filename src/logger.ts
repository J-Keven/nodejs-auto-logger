/* eslint-disable @typescript-eslint/no-explicit-any */
import DatadogTransport from 'datadog-winston';
import ddTracer from 'dd-trace';
import formats from 'dd-trace/ext/formats';
import {
  createLogger,
  format,
  transports,
  Logger as winstonLogger,
} from 'winston';

import { modifyClass } from './autolog';
import { ILevelName, ILogBusinessData, ILogHttpData, IType } from './types';

const anonymizeProps = [
  'password',
  'password_confirmation',
  'passwordConfirmation',
  'email',
  'token',
  'refreshToken',
  'accessToken',
  'authToken',
  'authorization',
  'auth',
];

/**
 * @class Logger
 * @requires
 *  Require the following environment variables:
 *  - NODE_ENV
 *  - DATADOG_INTEGRATION
 *  - APP_NAME
 * @description Winston logger class

 * @example
 * // Import the logger
 * import { Logger } from '@g4/logger';
 * // Create a new instance
 * const logger = new Logger();
 * // Log a message
 * logger.info('info', 'INFRA', 'logger.ts', Date.now(), 'Datadog integration is enabled');
 * logger.log('info', 'INFRA', 'logger.ts', Date.now(), 'Datadog integration is enabled
 */
export default class Logger {
  private app: string;
  private env: string;
  private request: any;
  private requestAnonymized: any;
  private userId: string;
  private endpoint: string;
  private requestMethod: string;
  private startedRequest: Date;
  private datadogIntegration: boolean;
  public logger: winstonLogger;

  constructor() {
    this.app = String(process.env.APP_NAME);
    this.env = String(process.env.NODE_ENV);
    this.startedRequest = new Date();
    this.datadogIntegration = Boolean(process.env.DATADOG_INTEGRATION);

    this.init();

    if (this.datadogIntegration) {
      this.addDatadogTransport(this);
    }
  }

  public autoLog(classObject: any, type: IType) {
    return modifyClass(classObject, type);
  }

  private addDatadogTransport(instance: Logger) {
    this.logger.add(
      new DatadogTransport({
        apiKey: String(process.env.DATADOG_API_KEY),
        ddsource: 'nodejs',
        ddtags: `env:${instance.env},app:${instance.app}`,
        service: instance.app,
      }),
    );
  }

  private getSize(obj: any) {
    let str = null;
    if (typeof obj === 'string') {
      str = obj;
    } else {
      str = JSON.stringify(obj);
    }
    const bytes = new TextEncoder().encode(str).length;
    return bytes;
  }

  private generateAnonymizedCache(): any {
    let cache: Map<any, any> | null = new Map();
    return cache;
  }

  private clearAnonymizedCache(cache: Map<any, any> | null): void {
    if (cache) {
      cache.clear();
      // eslint-disable-next-line no-param-reassign
      cache = null;
    }
  }

  private anonymize(obj: any, cache: Map<any, any>): any {
    if (cache.has(obj)) {
      return cache.get(obj);
    }

    let bodyAnonymized = { ...obj };
    cache.set(obj, bodyAnonymized);
    // eslint-disable-next-line no-restricted-syntax
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        bodyAnonymized[key] = this.anonymize(obj[key], cache);
      } else if (anonymizeProps.includes(key)) {
        bodyAnonymized[key] = '**********';
      }
    }

    cache.set(obj, bodyAnonymized);
    return bodyAnonymized;
  }

  public init = () => {
    this.logger = createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [new transports.Console()],
    });
    return this.logger;
  };

  public generateSpan(
    name: string,
    spanType: IType,
    data?: any,
    startTime: number = Date.now(),
  ) {
    const span = ddTracer.startSpan(name, {
      childOf: ddTracer.scope().active() as any,
      tags: {
        'service.name': this.app,
        'span.type': spanType,
        data,
      },
      startTime,
    });

    if (span) {
      ddTracer.inject(span.context(), formats.LOG, data);
    }
    return span;
  }

  httpIncoming(request: any) {
    const requestPayload = {
      body: { ...request?.body },
      headers: { ...request?.headers },
      params: { ...request?.params },
      query: { ...request?.query },
    };

    this.endpoint = request.url;
    this.userId = request.userId;
    this.request = request;
    this.requestMethod = request.method;
    this.requestAnonymized = requestPayload;

    const data: ILogHttpData = {
      levelname: 'info',
      app: this.app,
      env: this.env,
      endpoint: this.endpoint,
      requestMethod: this.requestMethod,
      timestamp: Date.now(),
      message: 'REQUEST RECEIVED',
      type: 'HTTP-INCOMING',
      request: requestPayload,
      requestSize: this.getSize(requestPayload),
      userId: this.userId,
    };

    const cache = this.generateAnonymizedCache();
    const dataAnonymized = this.anonymize(data, cache);
    this.clearAnonymizedCache(cache);

    this.logger.log('info', dataAnonymized);
  }

  httpOutgoing(
    levelName: ILevelName,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS',
    url: string,
    statusCode: number,
    body: any,
    response: { body: any; headers: any },
    startTime: Date,
    message: string,
    error?: Error,
  ) {
    const bodyParse = { ...body };

    const responsePayload = { ...response };

    const data: ILogHttpData = {
      levelname: levelName,
      app: this.app,
      env: this.env,
      endpoint: this.endpoint,
      uri: url,
      requestMethod: method,
      timestamp: Date.now(),
      message,
      type: 'HTTP-OUTGOING',
      statuscode: statusCode,
      request: bodyParse,
      requestSize: this.getSize(bodyParse),
      response: responsePayload,
      responseSize: this.getSize(responsePayload),
      requestTime: `${new Date().getTime() - new Date(startTime).getTime()}ms`,
      userId: this.userId,
      error,
    };

    const cache = this.generateAnonymizedCache();
    const dataAnonymized = this.anonymize(data, cache);
    this.clearAnonymizedCache(cache);

    this.generateSpan(
      `HTTP-OUTGOING ${method} ${url}`,
      'HTTP',
      dataAnonymized,
      new Date(startTime).getTime(),
    ).finish(Date.now());

    this.logger.log(levelName, dataAnonymized);
  }

  httpOutcoming(
    levelName: ILevelName,
    statusCode: number,
    response: any,
    message: string,
    error?: Error,
  ) {
    const responsePayload = {
      body: { ...response?.body },
      headers: { ...response?.headers },
    };

    const data: ILogHttpData = {
      levelname: levelName,
      app: this.app,
      env: this.env,
      endpoint: this.endpoint,
      requestMethod: this.requestMethod,
      timestamp: Date.now(),
      message,
      type: 'HTTP-OUTCOMING',
      statuscode: statusCode,
      request: this.requestAnonymized,
      requestSize: this.getSize(this.request?.body),
      response: responsePayload,
      responseSize: this.getSize(responsePayload.body),
      requestTime: `${new Date().getTime() - this.startedRequest.getTime()}ms`,
      userId: this.userId,
      error,
    };

    const cache = this.generateAnonymizedCache();
    const dataAnonymized = this.anonymize(data, cache);
    this.clearAnonymizedCache(cache);

    this.logger.log(levelName, dataAnonymized);
  }

  info(
    type: IType,
    functionName: string,
    startTime: number,
    message: string,
    value?: any,
  ) {
    this.log('info', type, functionName, startTime, message, value);
  }

  warn(
    type: IType,
    functionName: string,
    startTime: number,
    message: string,
    value?: any,
    error?: Error,
  ) {
    this.log('warn', type, functionName, startTime, message, value, error);
  }

  error(
    type: IType,
    functionName: string,
    startTime: number,
    message: string,
    value?: any,
    error?: Error,
  ) {
    this.log('error', type, functionName, startTime, message, value, error);
  }

  log(
    levelName: ILevelName,
    type: IType,
    functionName: string,
    startTime: number,
    message: string,
    value?: any,
    error?: Error,
  ) {
    const data: ILogBusinessData = {
      levelname: levelName,
      level: levelName,
      app: this.app,
      env: this.env,
      endpoint: this.endpoint,
      requestMethod: this.requestMethod,
      userId: this.userId,
      type,
      functionname: functionName,
      timestamp: Date.now(),
      executionTime: `${
        new Date().getTime() - new Date(startTime).getTime()
      }ms`,
      message,
      error,
      value: { ...value },
    };

    const cache = this.generateAnonymizedCache();
    const dataAnonymized = this.anonymize(data, cache);
    this.clearAnonymizedCache(cache);

    this.logger.log(levelName, dataAnonymized);
  }
}
