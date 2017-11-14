// @flow
'use strict';

const Client = require('./Client');
const Server = require('./Server');

async function test() {
  const server = new Server();
  server.on('echo', options => options);

  const client = new Client();
  const result = await client.call('echo', { option: 42 });
  // eslint-disable-next-line no-console
  console.log('client received:', result);

  client.close();
}

test();

process.on('unhandledRejection', (reason, p) => {
  // eslint-disable-next-line no-console
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
});
