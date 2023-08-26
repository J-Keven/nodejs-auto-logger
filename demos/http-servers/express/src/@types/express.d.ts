// eslint-disable-next-line import/no-relative-packages
import { Logger } from '../../../../../src';

declare namespace Express {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface Request {
    logger: Logger;
  }
}
