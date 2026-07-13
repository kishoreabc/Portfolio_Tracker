import { NextResponse } from 'next/server';

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

  const symbols = [
    'ITC.NS', 'SOUTHBANK.NS', 'KTKBANK.NS', 'TCS.NS', 'GOLDBEES.NS',
    'NATCOPHARM.NS', 'DRREDDY.NS', 'TMCV.NS', 'TMPV.NS', 'IDFCFIRSTB.NS',
    'INDUSINDBK.NS', 'WIPRO.NS', 'HEROMOTOCO.NS', 'ZYDUSLIFE.NS', 'JYOTHYLAB.NS',
    'CIPLA.NS', 'ITCHOTELS.NS', 'MANAPPURAM.NS', 'MUTHOOTFIN.NS',
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
