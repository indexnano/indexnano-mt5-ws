const WS = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');

class IndexNanoWS {
  constructor(connectionId, apiKey, options = {}) {
    this.connectionId = connectionId;
    this.apiKey = apiKey;
    this.wsUrl = options.wsUrl || 'wss://ws.indexnano.com';
    this.restBase = options.restBase || 'https://mt-api.indexnano.com/v1';
    this.ws = null;           
    this.orderProfitWs = null; 
    this.eventListeners = { order: [], quote: [], equity: [], profit: [], orders: [], update: [], error: [] };
    this.subscribedSymbols = new Set();
    this.orderUpdatesActive = false;
  }

  async subscribeOrderUpdates() {
    if (this.orderUpdatesActive) return;
    const res = await fetch(`${this.restBase}/SubscribeOrderUpdate?id=${this.connectionId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error('Failed to subscribe to order updates');
    this.orderUpdatesActive = true;
    this._openWebSocket('OnOrderUpdate');
  }

  async subscribeQuote(symbol) {
    if (this.subscribedSymbols.has(symbol)) return;
    const res = await fetch(`${this.restBase}/Subscribe?id=${this.connectionId}&symbol=${symbol}&interval=100`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error(`Failed to subscribe to ${symbol}`);
    this.subscribedSymbols.add(symbol);
    if (!this.ws || this.ws.readyState !== WS.OPEN) {
      this._openWebSocket('OnQuote');
    }
  }

  async unsubscribeQuote(symbol) {
    if (!this.subscribedSymbols.has(symbol)) return;
    await fetch(`${this.restBase}/UnSubscribe?id=${this.connectionId}&symbol=${symbol}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    this.subscribedSymbols.delete(symbol);
    if (this.subscribedSymbols.size === 0 && this.ws) this.ws.close();
  }

  _openWebSocket(endpoint) {
    if (this.ws && this.ws.readyState === WS.OPEN) return;
    const url = `${this.wsUrl}/ws/${endpoint}?id=${this.connectionId}&api_key=${this.apiKey}`;
    this.ws = new WS(url);
    this.ws.onmessage = (event) => this._handleMessage(event.data);
    this.ws.onclose = () => this._autoUnsubscribe();
  }

  _handleMessage(raw) {
    let data;
    try { data = JSON.parse(raw); } catch(e) { data = raw; }
    if (data.symbol && (data.bid !== undefined || data.ask !== undefined)) {
      this.emit('quote', data);
    } else {
      this.emit('order', data);
    }
  }

  async _autoUnsubscribe() {
    if (this.orderUpdatesActive) {
      await fetch(`${this.restBase}/UnSubscribeOrderUpdate?id=${this.connectionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }).catch(() => {});
      this.orderUpdatesActive = false;
    }
    for (const sym of [...this.subscribedSymbols]) {
      await this.unsubscribeQuote(sym).catch(() => {});
    }
  }

  connectOrderProfit() {
    if (this.orderProfitWs && this.orderProfitWs.readyState === WS.OPEN) {
      return; 
    }
    
    if (this.orderProfitWs) {
      this.orderProfitWs.close();
    }
    const url = `${this.wsUrl}/wsOrderProfit?id=${this.connectionId}&api_key=${this.apiKey}`;
    this.orderProfitWs = new WS(url);

    this.orderProfitWs.onopen = () => {
      this.emit('open');
    };

    this.orderProfitWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.Equity !== undefined) this.emit('equity', data.Equity);
        if (data.Profit !== undefined) this.emit('profit', data.Profit);
        if (data.OpenedOrders !== undefined) this.emit('orders', data.OpenedOrders);
        
        this.emit('update', data);
      } catch (e) {
        this.emit('error', e);
      }
    };

    this.orderProfitWs.onerror = (err) => {
      this.emit('error', err);
    };

    this.orderProfitWs.onclose = () => {
      
      fetch(`${this.restBase}/UnSubscribeOrderProfit?id=${this.connectionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }).catch(() => {});
      this.emit('close');
    };
  }

  
  on(event, callback) {
    if (!this.eventListeners[event]) {
      throw new Error(`Unknown event: ${event}`);
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      for (const cb of this.eventListeners[event]) {
        cb(data);
      }
    }
  }

  
  close() {
    if (this.ws) this.ws.close();
    if (this.orderProfitWs) this.orderProfitWs.close();
  }
}

module.exports = IndexNanoWS;
