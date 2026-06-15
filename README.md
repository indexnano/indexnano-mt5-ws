# @indexnano/mt5-ws

WebSocket SDK for real-time MT5 trading data – live orders, trades, and price quotes.

## Prerequisites

- You must have a valid API key from IndexNano
- You must have an active MT5 connection ID obtained via REST /ConnectEx endpoint
- Your account must have sufficient credits

## Installation

npm install @indexnano/mt5-ws

## Quick Start

import IndexNanoWS from '@indexnano/mt5-ws';

const client = new IndexNanoWS('YOUR_CONNECTION_ID', 'YOUR_API_KEY');

client.on('order', (event) => {
  console.log('Order update:', event);
});

client.on('quote', (quote) => {
  console.log(`${quote.symbol}: ${quote.bid} / ${quote.ask}`);
});

await client.subscribeOrderUpdates();
await client.subscribeQuote('EURUSD');
await client.subscribeQuote('GBPUSD');

## API Reference

new IndexNanoWS(connectionId, apiKey, options)
- connectionId: string - your connection id
- apiKey: string - Your IndexNano API key
- options.wsUrl: string - optional, defaults to wss://ws.indexnano.com
- options.restBase: string - optional, defaults to https://mt-api.indexnano.com/v1

Methods:
- subscribeOrderUpdates() - enables real-time order events, opens WebSocket
- subscribeQuote(symbol) - subscribes to live price ticks
- unsubscribeQuote(symbol) - stops price ticks
- on(event, callback) - event: 'order' or 'quote'
- close() - manually closes WebSocket

Events:
- order: object - order update (opened, modified, closed, filled, cancelled)
- quote: object - { symbol, bid, ask, time, last, volume }

Auto-Unsubscribe: SDK automatically unsubscribes when WebSocket closes.

## Full Example with Error Handling

const client = new IndexNanoWS(connectionId, apiKey);

client.on('order', (order) => {
  if (order.state === 'Filled') {
    console.log(`Order filled: ${order.symbol} ${order.lots} @ ${order.openPrice}`);
  }
});

client.on('quote', (quote) => {
  // update UI
});

try {
  await client.subscribeOrderUpdates();
  await client.subscribeQuote('EURUSD');
} catch (err) {
  console.error('Failed:', err.message);
}

client.close();

## Support

daus@indexnano.com | https://indexnano.com

## License

MIT
