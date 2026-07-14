import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const indexMap: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'NIFTY NEXT 50': 'JUNIORBEES.NS',
    'NIFTY 100': '^CNX100',
    'NIFTY MIDCAP 50': '^NSEMDCP50',
    'NIFTY SMALLCAP 100': '^CNXSC',
    'NIFTY BANK': '^NSEBANK',
    'NIFTY AUTO': '^CNXAUTO',
    'NIFTY FIN SERVICE': '^CNXFIN',
    'NIFTY IT': '^CNXIT',
    'NIFTY PHARMA': '^CNXPHARMA',
    'NIFTY FMCG': '^CNXFMCG',
    'NIFTY METAL': '^CNXMETAL',
    'INDIA VIX': '^INDIAVIX'
  };

  const allIndianStocks = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
    'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'HINDUNILVR.NS', 'LT.NS',
    'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS',
    'M&M.NS', 'ASIANPAINT.NS', 'KOTAKBANK.NS', 'TITAN.NS', 'POWERGRID.NS',
    'NTPC.NS', 'BAJAJFINSV.NS', 'ADANIENT.NS', 'WIPRO.NS', 'NESTLEIND.NS',
    'ONGC.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'TATASTEEL.NS', 'GRASIM.NS',
    'CIPLA.NS', 'TECHM.NS', 'BRITANNIA.NS', 'SBILIFE.NS', 'DRREDDY.NS',
    'APOLLOHOSP.NS', 'EICHERMOT.NS', 'DIVISLAB.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS',
    'COALINDIA.NS', 'LTIM.NS', 'UPL.NS', 'BPCL.NS', 'INDUSINDBK.NS',
    'HDFCLIFE.NS', 'ADANIPORTS.NS', 'TATACONSUM.NS', 'ZOMATO.NS', 'JIOFIN.NS',
    'SOUTHBANK.NS', 'KTKBANK.NS', 'TCS.NS', 'GOLDBEES.NS',
    'NATCOPHARM.NS', 'DRREDDY.NS', 'TMCV.NS', 'TMPV.NS', 'IDFCFIRSTB.NS',
    'INDUSINDBK.NS', 'WIPRO.NS', 'HEROMOTOCO.NS', 'ZYDUSLIFE.NS', 'JYOTHYLAB.NS',
    'CIPLA.NS', 'ITCHOTELS.NS', 'MANAPPURAM.NS', 'MUTHOOTFIN.NS'
  ];

  // Remove duplicates that might exist in the combined list
  const uniqueIndianStocks = Array.from(new Set(allIndianStocks));
  const shuffledStocks = [...uniqueIndianStocks].sort(() => 0.5 - Math.random());
  const selectedStocks = shuffledStocks.slice(0, 15);

  const symbols = [
    ...selectedStocks,
    ...Object.keys(indexMap)
  ];

  try {
    const promises = symbols.map(async (sym) => {
      const yahooSymbol = indexMap[sym] || sym;
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`);
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose;
      const changePercent = ((price - prevClose) / prevClose) * 100;
      
      return {
        symbol: sym.replace('.NS', ''),
        value: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
      };
    });

    const results = await Promise.all(promises);
    return NextResponse.json(results.filter(Boolean));
  } catch (error) {
    console.error("Market data fetch error:", error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
