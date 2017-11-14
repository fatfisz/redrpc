// @flow
'use strict';

const Base = require('./Base');

class Client extends Base {
  getCallPayload(options: mixed) {
    return {
      id: this.getId(),
      ts: this.getTimestamp(),
      kw: options,
    };
  }

  async pushCall(name: string, options: mixed) {
    const key = this.getCallQueueName(name);
    const payload = this.getCallPayload(options);
    const value = JSON.stringify(payload);

    await this.client.rpushex([key], value, this.queueExpiry);

    return payload.id;
  }

  async popResponse(name: string, id: string) {
    const key = this.getResponseQueueName(name, id);
    for (let count = 0; count < this.retries; count += 1) {
      const result = await this.client.blpop([key], this.requestTimeout);
      if (result !== null) {
        return result[1];
      }
    }
    throw new Error('The call timed out');
  }

  async call(name: string, options: mixed) {
    const id = await this.pushCall(name, options);
    const value = await this.popResponse(name, id);
    const result = JSON.parse(value);
    return result;
  }
}

module.exports = Client;
