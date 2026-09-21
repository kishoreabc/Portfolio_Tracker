import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      platform: 'Portfolio Dashboard',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      asset_classes: [
        'Equities (NSE & BSE)',
        'Corporate Bonds',
        'Government & Sovereign Bonds',
        'Daily Cash Flow & Transactions',
      ],
      indices_supported: [
        'NIFTY 50',
        'NIFTY NEXT 50',
        'NIFTY 100',
        'NIFTY MIDCAP 50',
        'NIFTY SMALLCAP 100',
        'NIFTY BANK',
        'NIFTY AUTO',
        'NIFTY FIN SERVICE',
        'NIFTY IT',
        'NIFTY PHARMA',
        'NIFTY FMCG',
        'NIFTY METAL',
        'INDIA VIX',
      ],
      endpoints: {
        market_data: '/api/market-data',
        health: '/api/v1/health',
        openapi_json: '/openapi.json',
        openapi_yaml: '/api/openapi.yaml',
        mcp_server: '/.well-known/mcp',
        llms_txt: '/llms.txt',
        sitemap: '/sitemap.xml',
        docs: '/docs',
        developers: '/developers',
      },
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    }
  );
}
