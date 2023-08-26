// eslint-disable-next-line import/no-relative-packages
import { AutoLog, Logger } from '../../../../../src';

class DogsAdapter {
  public autoLogDecorated = false;
  constructor() {
    //
  }

  public async get(data: any): Promise<string> {
    return 'Hello World!';
  }
}

// @AutoLog('SERVICE')
export class DemoService {
  public autoLogDecorated = false;
  constructor() {
    const logger = new Logger();
    logger.autoLog(this, 'SERVICE');
  }

  public async execute(test: string, test2: string): Promise<any> {
    this.test();
    return {
      ignoreLog: false,
      warn: true,
    };
  }

  test() {
    console.log('Função sincrona executada');
  }
}
