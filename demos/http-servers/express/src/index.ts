/* eslint-disable import/no-relative-packages */
/* eslint-disable import-helpers/order-imports */
import 'dotenv/config';
import express from 'express';
import { Logger, tracer } from '../../../../src';

// eslint-disable-next-line prettier/prettier, import/no-relative-packages
import { DemoService } from './services/demo.service';

tracer({
  port: 8112,
  hostname: '18.210.17.19',
  logInjection: true,
  service: process.env.APP_NAME,
  tags: {
    env: process.env.NODE_ENV,
    app: process.env.APP_NAME,
  },
});
const app = express();

const demoService = new DemoService();

app.get(
  '/',
  (req, res, next) => {
    const logger = new Logger();
    logger.httpIncoming(req);
    req.logger = logger;

    function onResDone(err: Error) {
      if (res.statusCode < 400) {
        const obj1 = { foo: 'bar' };
        let obj2 = { foo: 'bar2' };

        obj2 = { ...obj2, obj2 };
        const obj3 = { foo: 'bar3', obj2 };
        const obj4 = { foo: 'bar4', obj1, obj3 };

        logger.httpOutcoming(
          'info',
          res.statusCode,
          { body: obj4 },
          'REQUEST HAS SUCCESS',
        );
      }
      res.removeListener('finish', onResDone);
      res.removeListener('error', onResDone);
    }
    res.on('finish', onResDone);

    next();
  },
  async (req, res) => {
    const result = await demoService.execute('test', 'test2');

    res.send(result);
  },
);

app.listen(3000);
