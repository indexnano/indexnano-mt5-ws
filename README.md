## Documentation for `@indexnano/mt5-ws`

### Installation

```bash
npm install @indexnano/mt5-ws
```

### Quick Start – Real-Time Order & Profit Stream

```javascript
const IndexNanoWS = require('@indexnano/mt5-ws');

// Create client with your connection ID and API key
const client = new IndexNanoWS('YOUR_CONNECTION_ID', 'YOUR_API_KEY');

// Listen to the full payload (equity, profit, open orders)
client.on('update', (data) => {
  console.log('Equity:', data.Equity);
  console.log('Profit:', data.Profit);
  console.log('Open Orders:', data.OpenedOrders);
});

// Listen to individual fields
client.on('equity', (eq) => console.log('Equity:', eq));
client.on('profit', (p) => console.log('Profit:', p));
client.on('orders', (orders) => console.log('Orders:', orders));

// Connect to the WebSocket stream
client.connectOrderProfit();
```

### How It Works

- The SDK opens a WebSocket to `wss://ws.indexnano.com/wsOrderProfit` with your credentials.
- Your server pushes a JSON payload every second containing:
  - `Equity` – current account equity
  - `Profit` – total floating profit/loss
  - `OpenedOrders` – array of all open positions (symbol, volume, profit, open price, SL/TP, current price)
- The connection stays alive until you call `client.close()` or the user disconnects.
- When the connection ends, the SDK automatically calls the REST `UnSubscribeOrderProfit` endpoint to stop the background thread on the server (no resource leaks).

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update` | full object | Complete payload with `Equity`, `Profit`, `OpenedOrders` |
| `equity` | number | Current equity value |
| `profit` | number | Current floating P&L |
| `orders` | array | List of open orders |
| `open` | – | Fired when WebSocket opens |
| `close` | – | Fired when WebSocket closes |
| `error` | Error | Fired on WebSocket error |

### Full Example with Error Handling

```javascript
const IndexNanoWS = require('@indexnano/mt5-ws');

const client = new IndexNanoWS(connectionId, apiKey);

client.on('open', () => console.log('Connected to stream'));
client.on('update', (data) => {
  console.log(`Equity: ${data.Equity}, Profit: ${data.Profit}`);
  console.log(`Open positions: ${data.OpenedOrders.length}`);
});
client.on('error', (err) => console.error('WebSocket error:', err));
client.on('close', () => console.log('Disconnected'));

try {
  client.connectOrderProfit();
} catch (err) {
  console.error('Failed to connect:', err);
}

// When done (e.g., user logs out)
client.close();
```

### Requirements

- You must already have a valid `connection_id` from your REST `/ConnectEx` call.
- Your API key must have sufficient credits and an active MT5 session.
- The MT5 account must be `status = true` (not paused).

### Notes

- The server pushes data once per second; this interval is fixed.
- No separate subscription REST call is needed – the WebSocket itself starts the stream.
- The SDK automatically unsubscribes on close; no manual cleanup required.
