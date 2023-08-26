import { TracerOptions } from 'dd-trace';

export type ILevelName = 'info' | 'error' | 'warn' | 'debug';
export type IType =
  | 'HTTP'
  | 'INFRA'
  | 'DOMAIN'
  | 'CONTROLLER'
  | 'USE_CASE'
  | 'REPOSITORY'
  | 'ENTITY'
  | 'VALUE_OBJECT'
  | 'APPLICATION'
  | 'ADAPTER'
  | 'DATABASE'
  | 'UNKNOWN'
  | 'SERVICE'
  | 'EVENT'
  | 'QUERY'
  | 'COMMAND'
  | 'JOB'
  | 'SAGA'
  | 'PIPE'
  | 'MIDDLEWARE'
  | 'GATEWAY';

type IHttpResponse = {
  body: any;
  headers: any;
};

type IHttpRequest = {
  body: any;
  headers: any;
  params: any;
  query: any;
};

export type ILogHttpData = {
  app: string;
  env: string;
  endpoint: string;
  uri?: string;
  requestMethod: string;
  timestamp: number;
  type: 'HTTP-INCOMING' | 'HTTP-OUTGOING' | 'HTTP-OUTCOMING';
  levelname: ILevelName;
  userId: string;
  request: IHttpRequest;
  statuscode?: number;
  requestSize?: number;
  response?: IHttpResponse;
  responseSize?: number;
  message?: string;
  error?: any;
  requestTime?: string;
};

export type ILogBusinessData = {
  level: ILevelName;
  levelname: ILevelName;
  app: string;
  env: string;
  timestamp: number;
  executionTime: string;
  type: IType;
  endpoint: string;
  functionname: string;
  requestMethod: string;
  userId: string;
  message: string;
  value?: any;
  error?: any;
};

export interface ITracingParams extends TracerOptions {
  /**
   * @default 8126
   * @description Port the agent is listening on
   */
  port: number;
  /**
   * @default localhost
   * @description Hostname the agent is listening on
   * */
  hostname: string;
  logInjection?: boolean;
  /**
   * @default true
   * @description Enable runtime metrics
   */
  runtimeMetrics?: boolean;
  /**
   * @default true
   * @description Enable profiling
   */
  profiling?: boolean;
}
