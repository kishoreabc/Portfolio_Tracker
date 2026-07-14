import * as yf from 'yahoo-finance2';

async function test() {
  try {
    const YahooFinance = yf.default;
    const yahooFinance = new YahooFinance();
    const res = await yahooFinance.quote('RELIANCE.NS');
    console.log(res.symbol);
  } catch(e) {
    console.error(e);
  }
}
test();
