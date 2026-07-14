import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const res = await yahooFinance.quote('RELIANCE.NS');
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();
