/* eslint-disable prefer-destructuring */
import isString from '@tinkoff/utils/is/string';
import isObject from '@tinkoff/utils/is/object';
import isArray from '@tinkoff/utils/is/array';
import { safeStringifyJSON } from '@tramvai/safe-strings';

import type { LogObj } from '../../logger.h';

export const formatError = (error: Error | string) => {
  if (isString(error)) {
    // eslint-disable-next-line no-param-reassign
    error = new Error(error);
  }

  // поля message, stack на объекте Error не перечислимые по дефолту,
  // поэтому явно указываем что они перечислимы,
  // чтобы JSON.stringify сложил их в результирующую json строку
  Object.defineProperties(error, {
    message: {
      configurable: true,
      enumerable: true,
      writable: true,
    },
    stack: {
      configurable: true,
      enumerable: true,
      // stack is getter
    },
    cause: {
      configurable: true,
      enumerable: true,
      writable: true,
    },
  });

  if ('cause' in error && typeof error.cause === 'object') {
    Object.defineProperties(error.cause, {
      message: {
        configurable: true,
        enumerable: true,
        writable: true,
      },
      stack: {
        configurable: true,
        enumerable: true,
        // stack is getter
      },
    });
  }

  return {
    ...error,
    // @ts-ignore
    // хотим чтобы всегда был единый формат для error.body и error.code [text]
    // игнор потому что в error нет поля body и code
    body: safeStringifyJSON(error.body),
    // если code уже строка - то не делаем stringify т.к. получим экранирование кавычек. Например "\"ABORT_ERR\""
    code:
      // @ts-expect-error потому что в error нет поля code
      typeof error.code === 'string'
        ? // @ts-expect-error
          error.code
        : // @ts-expect-error
          safeStringifyJSON(error.code),
  };
};

interface JsonLog {
  message: string;
  args?: unknown[];
  error?: ReturnType<typeof formatError>;
  [key: string]: unknown;
}

export const formatJson = (logObj: LogObj): JsonLog => {
  let fields = null;
  let message;
  let error;
  const { args } = logObj;

  if (args[0] instanceof Error) {
    error = formatError(args[0]);

    if (isString(args[1])) {
      message = args[1];
    } else {
      message = args[0].message;
    }
  } else if (isObject(args[0]) && !isArray(args[0])) {
    fields = args[0];
    error = fields.error && formatError(fields.error);

    if (args[0].message) {
      message = args[0].message;
    } else if (isString(args[1])) {
      message = args[1];
    }
  } else {
    message = args[0];
  }

  const otherArgs = args.slice(message === args[1] ? 2 : 1).map((arg) => {
    if (arg instanceof Error) {
      return { error: formatError(arg) };
    }

    return arg;
  });

  return {
    ...logObj,
    args: otherArgs.length ? otherArgs : undefined,
    ...fields,
    error,
    message,
  };
};

/* eslint-enable prefer-destructuring */
