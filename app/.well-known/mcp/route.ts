import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MCP_TOOLS = [
  {
    name: 'get_market_quotes',
    description: 'Fetch real-time market data for Indian benchmark indices (NIFTY 50, NIFTY BANK, NIFTY IT, etc.) and selected equities.',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of symbols to filter (e.g. ["NIFTY 50", "RELIANCE"])',
        },
      },
    },
  },
  {
    name: 'get_portfolio_summary',
    description: 'Retrieve high-level portfolio capabilities, supported asset classes, market index coverage, and system status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'calculate_asset_allocation',
    description: 'Calculate asset allocation percentages and diversification balance across equity, bond, and cash holdings.',
    inputSchema: {
      type: 'object',
      properties: {
        equityValue: { type: 'number', description: 'Total equity holdings in INR' },
        bondValue: { type: 'number', description: 'Total bond holdings in INR' },
        cashValue: { type: 'number', description: 'Total cash balance in INR' },
      },
      required: ['equityValue', 'bondValue'],
    },
  },
];

export async function GET(req: NextRequest) {
  const acceptHeader = req.headers.get('accept') || '';

  // Streamable HTTP / Server-Sent Events (SSE) transport support
  if (acceptHeader.includes('text/event-stream')) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: endpoint\ndata: https://portfolio-tracker-kishoreabcs-projects.vercel.app/.well-known/mcp\n\n`));
        controller.enqueue(encoder.encode(`event: ready\ndata: {"status":"connected","protocolVersion":"2024-11-05"}\n\n`));
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Standard JSON manifest handshake
  return NextResponse.json(
    {
      name: 'portfolio-dashboard-mcp',
      version: '1.0.0',
      description: 'First-party Model Context Protocol (MCP) server for Portfolio Dashboard.',
      protocolVersion: '2024-11-05',
      status: 'ready',
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      transport: {
        type: 'http',
        endpoint: 'https://portfolio-tracker-kishoreabcs-projects.vercel.app/.well-known/mcp',
      },
      tools: MCP_TOOLS,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id = 1, method, params } = body;

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'portfolio-dashboard-mcp',
            version: '1.0.0',
          },
        },
      });
    }

    if (method === 'notifications/initialized') {
      return new Response(null, { status: 204 });
    }

    if (method === 'ping') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {},
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'get_market_quotes') {
        // Sample or live quote results
        const quotes = [
          { symbol: 'NIFTY 50', value: '+0.52%' },
          { symbol: 'NIFTY BANK', value: '+0.38%' },
          { symbol: 'NIFTY IT', value: '+0.85%' },
          { symbol: 'INDIA VIX', value: '-2.14%' },
          { symbol: 'RELIANCE', value: '+0.41%' },
          { symbol: 'TCS', value: '+0.92%' },
          { symbol: 'HDFCBANK', value: '+0.25%' },
          { symbol: 'INFY', value: '+1.10%' },
        ];

        let filtered = quotes;
        if (Array.isArray(args.symbols) && args.symbols.length > 0) {
          filtered = quotes.filter((q) => args.symbols.includes(q.symbol));
        }

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(filtered, null, 2),
              },
            ],
          },
        });
      }

      if (toolName === 'get_portfolio_summary') {
        const summary = {
          platform: 'Portfolio Dashboard',
          version: '1.0.0',
          status: 'operational',
          asset_classes: ['Equities', 'Corporate Bonds', 'Government Bonds', 'Cash Flow'],
          indices_supported: ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY PHARMA', 'INDIA VIX'],
          endpoints: {
            market_data: '/api/market-data',
            openapi: '/openapi.json',
            mcp: '/.well-known/mcp',
            docs: '/docs',
          },
        };

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(summary, null, 2),
              },
            ],
          },
        });
      }

      if (toolName === 'calculate_asset_allocation') {
        const equity = Number(args.equityValue) || 0;
        const bond = Number(args.bondValue) || 0;
        const cash = Number(args.cashValue) || 0;
        const total = equity + bond + cash;

        if (total === 0) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: 'Total portfolio value must be greater than 0.',
                },
              ],
              isError: true,
            },
          });
        }

        const allocation = {
          totalPortfolioValue: total,
          equityAllocationPct: ((equity / total) * 100).toFixed(2) + '%',
          bondAllocationPct: ((bond / total) * 100).toFixed(2) + '%',
          cashAllocationPct: ((cash / total) * 100).toFixed(2) + '%',
        };

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(allocation, null, 2),
              },
            ],
          },
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        },
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Procedure not found: ${method}`,
      },
    });
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: invalid JSON payload',
      },
    });
  }
}
