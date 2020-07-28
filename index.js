const Bybit = require('./bybit')

const account = {
  apikey: '',
  secret: ''
}

const testAccount = {
  apikey: '',
  secret: '',
}

// production
// const bybit = new Bybit(account)

// testnet
const bybit = new Bybit(testAccount, 'testnet')
const fetchOrderbook = async () => {
  try {
    bybit.connect()
    bybit.subscribe('BTCUSD')

    // setInterval(() => {
    //   console.log(bybit.getOrderbook('BTCUSD'))
    // }, 100)

    const response = await bybit.getWalletBalance({
      coin: 'BTC'
    })

    console.log(JSON.stringify(response))

    // const response = await bybit.getKlines({
    //   symbol: 'BTCUSD',
    //   interval: '15', // 1 3 5 15 30 60 120 240 360 720 "D" "M" "W" "Y"
    //   from: Math.floor(Date.now() / 1000) - 86400,
    //   limit: 200
    // })

    // console.log(JSON.stringify(response))

    // const response = await bybit.getOrders({ symbol: 'BTCUSD', order_status: 'New'}) // Created, New, Rejected, PartiallyFilled, PartiallyFilled, Filled, Cancelled, PendingCancel 
    // console.log(JSON.stringify(response))

    // const response = await bybit.getPositions({ symbol: 'BTCUSD' }) // Created, New, Rejected, PartiallyFilled, PartiallyFilled, Filled, Cancelled, PendingCancel 
    // console.log(JSON.stringify(response))

    // const response = await bybit.changeLeverage({ symbol: 'BTCUSD', leverage: 20 })
    // console.log(JSON.stringify(response))

    // const response = await bybit.placeOrder({
    //   side: 'Buy', // Buy, Sell
    //   symbol: 'BTCUSD',
    //   order_type: 'Limit', // Market, Limit
    //   qty: 40, // in USD
    //   price: 10000,
    //   time_in_force: 'PostOnly', // PostOnly, FillOrKill, ImmediateOrCancel, GoodTillCancel
    //   // take_profit: , // Price
    //   // stop_loss:, // Price
    //   reduce_only: false,
    //   close_on_trigger: false,
    //   // order_link_id: false
    // })
    // console.log(JSON.stringify(response))

    // const response = await bybit.setTradingStop({
    //   symbol: 'BTCUSD',
    //   take_profit: 13000,
    //   stop_loss: 9500,
    //   // trailing_stop: 200,
    //   // new_trailing_active: 10800,
    // })
    // console.log(JSON.stringify(response))
  } catch (e) {
    console.error(e)
  }
}
fetchOrderbook()
