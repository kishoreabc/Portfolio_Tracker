import yf from 'yahoo-finance2';

async function test() {
  const YahooFinance = yf.default || yf;
  const yahooFinance = new YahooFinance();
  
  try {
    const historical = await yahooFinance.chart('RELIANCE.NS', {
      range: '1d',
      interval: '5m'
    }, { validateResult: false });
    
    console.log('Quotes returned:', historical.quotes.length);
    console.log('First quote:', historical.quotes[0]);
    console.log('Last quote:', historical.quotes[historical.quotes.length - 1]);
  } catch (e) {
    console.error(e);
  }
}
test();
