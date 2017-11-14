// @flow
'use strict';

const util = require('util');

const redis = require('redis');

type BlpopResult = [string, string] | null;

class RedisWrapper {
  client: redis.RedisClient;

  constructor(options: mixed) {
    this.client = redis.createClient(options);
  }

  quit() {
    this.client.quit();
  }

  registerScript(script: string) {
    const sha = this.scriptLoad(script);
    return async (keys: Array<string>, ...args: Array<mixed>) =>
      this.evalsha(await sha, keys, args);
  }

  wrap(method: Function): Function {
    const promisified = util.promisify(method);
    return promisified.bind(this.client);
  }

  rpushex = this.registerScript(`
    redis.call('rpush', KEYS[1], ARGV[1]);
    redis.call('expire', KEYS[1], ARGV[2]);
  `);

  blpop: (keys: Array<string>, timeout: number) => Promise<BlpopResult> = this.wrap(
    (keys, timeout, callback) => this.client.blpop(...keys, timeout, callback),
  );
  evalsha: (sha: string, keys: Array<string>, args: Array<mixed>) => Promise<void> = this.wrap(
    (sha, keys, args, callback) =>
      this.client.evalsha(sha, keys.length, ...keys, ...args, callback),
  );
  scriptLoad: (script: string) => Promise<string> = this.wrap((script, callback) =>
    this.client.script('load', callback),
  );
}

module.exports = RedisWrapper;
