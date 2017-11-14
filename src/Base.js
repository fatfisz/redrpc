// @flow
'use strict';

const uuid = require('uuid/v4');

const RedisWrapper = require('./RedisWrapper');

type BaseOptions = {
  prefix?: string,
  queueExpiry?: number,
  requestTimeout?: number,
  retries?: number,
};

class Base {
  client: RedisWrapper;
  prefix: string;
  queueExpiry: number;
  requestTimeout: number;
  retries: number;

  constructor(options?: BaseOptions = {}) {
    const {
      prefix = 'redis_rpc',
      queueExpiry = 120,
      requestTimeout = 1,
      retries = 5,
      ...wrapperOptions
    } = options;
    this.client = new RedisWrapper(wrapperOptions);
    this.prefix = prefix;
    this.queueExpiry = queueExpiry;
    this.requestTimeout = requestTimeout;
    this.retries = retries;
  }

  close() {
    this.client.quit();
  }

  getCallQueueName(name: string) {
    return `${this.prefix}:${name}:calls`;
  }

  getResponseQueueName(name: string, id: string) {
    return `${this.prefix}:${name}:${id}`;
  }

  getId() {
    return uuid();
  }

  getTimestamp() {
    return new Date().toISOString();
  }
}

module.exports = Base;
