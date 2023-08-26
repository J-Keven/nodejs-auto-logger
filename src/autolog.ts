/* eslint-disable no-return-assign */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable func-names */

import Logger from './logger';
import { IType } from './types';

export function modifyClass(classObject: any, classType: IType) {
  const className = classObject.constructor.name;
  const classObjectInstance = classObject;
  const prototype = Object.getPrototypeOf(classObjectInstance);
  const classMethods: string[] = Object.getOwnPropertyNames(prototype).filter(
    method =>
      method !== 'constructor' && typeof classObject[method] === 'function',
  );

  if (classObject.autoLogDecorated === true) {
    return classObject;
  }

  classObjectInstance.autoLogDecorated = true;

  classMethods.forEach(methodName => {
    let logger = classObject.logger as Logger;
    if (!logger) {
      logger = new Logger();
    }

    const originalMethod = classObjectInstance[methodName];
    classObjectInstance[methodName] = function (...args: any[]) {
      const startTime = Date.now();
      const jsonArgs = args.map(a => (typeof a === 'object' ? { ...args } : a));
      const span = logger.generateSpan(
        `${className}.${methodName}`,
        classType,
        jsonArgs,
      );

      // eslint-disable-next-line no-inner-declarations
      function handleError(error: any) {
        logger.error(
          classType,
          `${className}.${methodName}`,
          startTime,
          `${classType} ${className}.${methodName} HAS ERROR`,
          {
            error,
          },
        );
        span?.finish(Date.now());
        throw error;
      }

      try {
        let result = originalMethod.apply(this, args);
        if (typeof result?.then === 'function') {
          result = result
            .then((resolved: any) => resolved)
            .catch((err: any) => handleError(err));
        }
        span?.finish(Date.now());

        if (!result?.ignoreLog) {
          if (
            result?.isFailure ||
            result?.errors?.length > 0 ||
            result?.error
          ) {
            if (result?.warn) {
              logger.warn(
                classType,
                `${className}.${methodName}`,
                startTime,
                `${classType} ${className}.${methodName} HAS ERROR`,
                {
                  errors: result?.errors || result?.error,
                },
              );
            } else {
              logger.error(
                classType,
                `${className}.${methodName}`,
                startTime,
                `${classType} ${className}.${methodName} HAS ERROR`,
                {
                  errors: result?.errors || result?.error,
                },
              );
            }
          } else {
            logger.info(
              classType,
              `${className}.${methodName}`,
              startTime,
              `${classType} ${className}.${methodName} HAS SUCCESS`,
              {
                result: result?.isSuccessful ? result?.data : result,
              },
            );
          }
        }
        return result;
      } catch (error) {
        handleError(error);
      }
    };
  });
  classObjectInstance.autoLogDecorated = true;
}

export default function AutoLog(classType: IType) {
  return function (classObject: any) {
    return modifyClass(classObject.prototype, classType);
  };
}
