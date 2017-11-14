// @flow
'use strict';

const Base = require('./Base');

const servingStates = {
  idle: Symbol(),
  serving: Symbol(),
  closing: Symbol(),
};

type ResponsePayload = {
  ts: string,
  err?: string,
  res?: mixed,
};

type Handler = (?mixed) => ?mixed;

class Server extends Base {
  handlers: Map<string, Handler> = new Map();
  queueNames: Set<string> = new Set();
  queueNameToName: Map<string, string> = new Map();
  servingState = servingStates.idle;

  handlersDidChange() {
    this.queueNames = new Set();
    this.queueNameToName = new Map();

    for (const name of this.handlers.keys()) {
      const queueName = this.getCallQueueName(name);
      this.queueNames.add(queueName);
      this.queueNameToName.set(queueName, name);
    }

    const shouldBeServing = this.handlers.size > 0;

    if (shouldBeServing) {
      if (this.servingState === servingStates.idle) {
        setImmediate(() => this.serve());
      }
      this.servingState = servingStates.serving;
    } else if (this.servingState === servingStates.serving) {
      this.servingState = servingStates.closing;
    }
  }

  getResponsePayload(error: ?Error, result: ?mixed) {
    const payload: ResponsePayload = {
      ts: this.getTimestamp(),
    };

    if (error) {
      payload.err = error.stack ? error.stack : String(error);
    } else {
      payload.res = result;
    }

    return payload;
  }

  respond(name: string, id: string, error: ?Error, result: ?mixed) {
    const key = this.getResponseQueueName(name, id);
    const payload = this.getResponsePayload(error, result);
    const value = JSON.stringify(payload);
    return this.client.rpushex([key], value, this.queueExpiry);
  }

  async handleResult(callKey: string, callValue: string) {
    const name = this.queueNameToName.get(callKey);
    if (!name) {
      return;
    }
    const handler = this.handlers.get(name);
    if (!handler) {
      return;
    }

    const payload = JSON.parse(callValue);
    const result = await handler(payload.kw);
    await this.respond(name, payload.id, null, result);
  }

  async serve() {
    if (this.servingState !== servingStates.serving) {
      this.servingState = servingStates.idle;
      return;
    }

    const result = await this.client.blpop(Array.from(this.queueNames), this.requestTimeout);
    if (result !== null) {
      await this.handleResult(...result);
    }

    setImmediate(() => this.serve());
  }

  on(name: string, handler: Handler) {
    this.handlers.set(name, handler);
    this.handlersDidChange();
    return this;
  }

  off(name: string) {
    this.handlers.delete(name);
    this.handlersDidChange();
    return this;
  }
}

module.exports = Server;
