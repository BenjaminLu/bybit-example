const WebSocket = require('ws')
const axios = require('axios')
const crypto = require('crypto')

let client
const orderbooks = {}

class Bybit {
  constructor ({ apikey, secret }, env = 'production') {
    this.apikey = apikey
    this.secret = secret

    this.topicMap = {
      'BTCUSD': 'orderBook_200.100ms.BTCUSD'
    }
    this.isConnected = false
    this.subscribeTopics = new Set()
    if (env === 'testnet') {
      this.baseURL = `https://api-testnet.bybit.com`
    } else {
      this.baseURL = `https://api.bybit.com`
    }
  }

  getSignature(params) {
    if (this.apikey && this.secret) {
      const secret = this.secret
      var orderedParams = ""
      Object.keys(params).sort().forEach((key) => {
        orderedParams += key + "=" + params[key] + "&"
      })
      orderedParams = orderedParams.substring(0, orderedParams.length - 1)
      return crypto.createHmac('sha256', secret).update(orderedParams).digest('hex')
    } else {
      throw new Error('Please provide apikey and secret')
    }
  }

  addAuthDataGet (params) {
    var orderedParams = ""
    params.api_key = this.apikey
    params.timestamp = Date.now()
    params.sign = this.getSignature(params)

    Object.keys(params).sort().forEach((key) => {
      orderedParams += key + "=" + params[key] + "&"
    })
    orderedParams = orderedParams.substring(0, orderedParams.length - 1)
    return orderedParams
  }

  addAuthDataPost (params) {
    params.api_key = this.apikey
    params.timestamp = Date.now()
    params.sign = this.getSignature(params)
    return params
  }

  async getKlines (params) {
    params = this.addAuthDataGet(params)
    const res = await axios.get(`${this.baseURL}/v2/public/mark-price-kline?${params}`)
    return res.data
  }

  async setTradingStop (params) {
    params = this.addAuthDataPost(params)
    const res = await axios.post(`${this.baseURL}/open-api/position/trading-stop`, params)
    return res.data
  }

  async changeLeverage (params) {
    params = this.addAuthDataPost(params)
    const res = await axios.post(`${this.baseURL}/user/leverage/save`, params)
    return res.data
  }

  async getPositions (params) {
    params = this.addAuthDataGet(params)
    const res = await axios.get(`${this.baseURL}/v2/private/position/list?${params}`)
    return res.data
  }

  async getOrders (params) {
    params = this.addAuthDataGet(params)
    const res = await axios.get(`${this.baseURL}/open-api/order/list?${params}`)
    return res.data
  }

  async placeOrder (params) {
    params = this.addAuthDataPost(params)
    const res = await axios.post(`${this.baseURL}/v2/private/order/create`, params)
    return res.data
  }

  getOrderbook (pair) {
    if (this.isConnected) {
      const targetTopic = this.topicMap[pair]
      const orderbook = orderbooks[targetTopic]
      if (Array.isArray(orderbook)) {
        const bids = orderbook.filter(order => {
          return order.side.toLowerCase() === 'buy'
        })
      
        bids.sort((order1, order2) => {
          return parseFloat(order2.price) - parseFloat(order1.price)
        })
      
        const asks = orderbook.filter(order => {
          return order.side.toLowerCase() === 'sell'
        })
      
        asks.sort((order1, order2) => {
          return parseFloat(order1.price) - parseFloat(order2.price)
        })

        return {
          bids: bids,
          asks: asks
        }
      }
    }

    return {
      bids: [],
      asks: []
    }
  }

  subscribe (pair) {
    if (this.topicMap.hasOwnProperty(pair)) {
      this.subscribeTopics.add(pair)
    }
  }

  connect () {
    let client = new WebSocket('wss://stream.bybit.com/realtime')
    const heartbeat = () => {
      this.subscribeTopics.forEach(pair => {
        const targetTopic = this.topicMap[pair]
        client.send(`{"op": "subscribe", "args": ["${targetTopic}"]}`);
      })
      const timer = setTimeout(() => {
        client.send('{"op":"ping"}')
      }, 30000)
    }

    
    client.on('open', () => {
      this.isConnected = true
      heartbeat()
      client.on('error', (err) => {
        console.log(err)
        this.isConnected = false
        setTimeout(() => {
          console.log('reconnecting...')
          this.connect()
        }, 5000)
      })
      client.on('message', (msg) => {
        msg = JSON.parse(msg)
        if (msg.hasOwnProperty('topic') && msg.hasOwnProperty('type')) {
          const topic = msg.topic
          const type = msg.type
      
          if (type === 'snapshot') {
            orderbooks[topic] = msg.data
          } else if (type === 'delta') {
            const mustUpdates = msg.data.update
            const mustDeletes = msg.data.delete
  
            mustDeletes.forEach(mustDelete => {
              orderbooks[topic].forEach((bidOrAsk, index) => {
                if (mustDelete.price === bidOrAsk.price &&
                mustDelete.side === bidOrAsk.side &&
                mustDelete.symbol === bidOrAsk.symbol) {
                  delete orderbooks[topic][index]
                }
              })
            })
  
            mustUpdates.forEach(mustUpdate => {
              let hit = false
              orderbooks[topic].forEach((bidOrAsk, index) => {
                if (mustUpdate.price === bidOrAsk.price &&
                  mustUpdate.side === bidOrAsk.side &&
                  mustUpdate.symbol === bidOrAsk.symbol) {
                  hit = true
                  orderbooks[topic][index] = mustUpdate
                }
              })
  
              if (!hit) {
                orderbooks[topic].push(mustUpdate)
              }
            })
          }
        }
      })

      client.on('close', () => {
        this.isConnected = false
        console.log('reconnecting...')
        this.connect()
      })
    })
  }
}

module.exports = Bybit