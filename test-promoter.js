import yf from 'yahoo-finance2';

async function test() {
  const YahooFinance = yf.default || yf;
  const yahooFinance = new YahooFinance();
  const profile = await yahooFinance.quoteSummary('RELIANCE.NS', {
    modules: ['assetProfile', 'summaryDetail', 'price', 'defaultKeyStatistics'],
  }, { validateResult: false });
  
  console.log(JSON.stringify(profile.assetProfile?.companyOfficers?.slice(0, 3), null, 2));
  console.log('---');
  console.log(Object.keys(profile.assetProfile || {}));
}
test();
