import { spawn } from 'child_process';

const PORT = 3008;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {
      // ignore until online
    }
    await sleep(500);
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`Starting Agentic Readiness Verification Suite on ${BASE_URL}`);
  console.log(`======================================================\n`);

  const results = [];
  function record(id, title, passed, details) {
    results.push({ id, title, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} [Item ${id}] ${title}`);
    if (details) console.log(`   └─ ${details}`);
  }

  try {
    // 1. Content is available without JavaScript
    const homeRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeRes.text();
    const homeText = stripHtml(homeHtml);
    const hasH1 = /<h1\b[^>]*>(.*?)<\/h1>/i.test(homeHtml);
    record(
      1,
      'Content is available without JavaScript',
      homeText.length >= 500 && hasH1,
      `Raw HTML text length: ${homeText.length} chars (required >= 500), H1 detected: ${hasH1}`
    );

    // 2. Agent-friendly 404s
    const notFoundRes = await fetch(`${BASE_URL}/some-nonexistent-path-for-testing`);
    const notFoundBody = await notFoundRes.text();
    const isReal404 = notFoundRes.status === 404;
    const hasLinksIn404 = notFoundBody.includes('sitemap.xml') || notFoundBody.includes('llms.txt');
    record(
      2,
      'Agent-friendly 404s',
      isReal404 && hasLinksIn404,
      `HTTP status: ${notFoundRes.status} (required 404), Links in body: ${hasLinksIn404}`
    );

    // 3. OpenAPI spec published
    const openApiRes = await fetch(`${BASE_URL}/openapi.json`);
    const openApiData = await openApiRes.json();
    const openApiYamlRes = await fetch(`${BASE_URL}/api/openapi.yaml`);
    const isOpenApiValid = openApiRes.status === 200 && openApiData.openapi?.startsWith('3.1');
    record(
      3,
      'OpenAPI spec published',
      isOpenApiValid && openApiYamlRes.status === 200,
      `openapi.json status: ${openApiRes.status}, version: ${openApiData.openapi}, openapi.yaml status: ${openApiYamlRes.status}`
    );

    // 4. JSON error responses
    const unauthRes = await fetch(`${BASE_URL}/api/portfolio`);
    const unauthData = await unauthRes.json();
    const hasStructuredError =
      unauthRes.status === 401 &&
      Boolean(unauthData.code && unauthData.message && unauthData.resolution_hint);
    record(
      4,
      'JSON error responses',
      hasStructuredError,
      `Status: ${unauthRes.status}, code: ${unauthData.code}, message: "${unauthData.message}", hint: "${unauthData.resolution_hint?.slice(0, 40)}..."`
    );

    // 5. Markdown content negotiation
    const mdHomeRes = await fetch(`${BASE_URL}/`, {
      headers: { Accept: 'text/markdown' },
    });
    const mdHomeContent = await mdHomeRes.text();
    const mdVary = mdHomeRes.headers.get('vary') || '';
    const mdType = mdHomeRes.headers.get('content-type') || '';
    const isAcceptMdOk =
      mdHomeRes.status === 200 &&
      mdType.includes('text/markdown') &&
      mdVary.toLowerCase().includes('accept') &&
      mdHomeContent.startsWith('#');
    record(
      5,
      'Markdown content negotiation (acceptmarkdown.com)',
      isAcceptMdOk,
      `Content-Type: ${mdType}, Vary: ${mdVary}, starts with Markdown heading: ${mdHomeContent.startsWith('#')}`
    );

    // 6. Brand name discoverability
    const hasBrandTitle = /<title[^>]*>.*?Portfolio Dashboard.*?<\/title>/i.test(homeHtml);
    const hasBrandH1 = /<h1[^>]*>.*?Portfolio Dashboard.*?<\/h1>/i.test(homeHtml);
    record(
      6,
      'Brand name discoverability',
      hasBrandTitle && hasBrandH1,
      `Title has "Portfolio Dashboard": ${hasBrandTitle}, H1 has "Portfolio Dashboard": ${hasBrandH1}`
    );

    // 7. Public API with reachable endpoints
    const marketRes = await fetch(`${BASE_URL}/api/market-data`);
    const marketData = await marketRes.json();
    const summaryRes = await fetch(`${BASE_URL}/api/v1/summary`);
    const summaryData = await summaryRes.json();
    const isMarketOk = marketRes.status === 200 && Array.isArray(marketData);
    const isSummaryOk = summaryRes.status === 200 && summaryData.platform === 'Portfolio Dashboard';
    record(
      7,
      'Public API with reachable endpoints',
      isMarketOk && isSummaryOk,
      `market-data status: ${marketRes.status} (count: ${marketData?.length || 0}), summary status: ${summaryRes.status}`
    );

    // 8. Developer portal
    const devRes = await fetch(`${BASE_URL}/developers`);
    const devHtml = await devRes.text();
    const isDevPortalOk =
      devRes.status === 200 &&
      devHtml.includes('Portfolio Dashboard Developer Portal') &&
      devHtml.includes('curl');
    record(
      8,
      'Developer portal',
      isDevPortalOk,
      `Status: ${devRes.status}, Contains Developer Portal & Quickstarts: ${isDevPortalOk}`
    );

    // 9. JSON-LD structured data
    const jsonLdMatch = homeHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    let parsedJsonLd = null;
    if (jsonLdMatch) {
      try {
        parsedJsonLd = JSON.parse(jsonLdMatch[1]);
      } catch {
        // error
      }
    }
    const softwareAppSchema = Array.isArray(parsedJsonLd)
      ? parsedJsonLd.find((s) => s['@type'] === 'SoftwareApplication')
      : parsedJsonLd?.['@type'] === 'SoftwareApplication' ? parsedJsonLd : null;
    const hasJsonLdApp = Boolean(softwareAppSchema && softwareAppSchema.name && softwareAppSchema.offers);
    record(
      9,
      'JSON-LD structured data',
      hasJsonLdApp,
      `SoftwareApplication schema found: ${Boolean(softwareAppSchema)}, name: "${softwareAppSchema?.name}"`
    );

    // 10. Public API/docs linked from homepage
    const linksDocs = homeHtml.includes('/docs');
    const linksDev = homeHtml.includes('/developers');
    const linksOpenApi = homeHtml.includes('/openapi.json');
    record(
      10,
      'Public API/docs linked from homepage',
      linksDocs && linksDev && linksOpenApi,
      `Links to /docs: ${linksDocs}, /developers: ${linksDev}, /openapi.json: ${linksOpenApi}`
    );

    // 11. Agent instruction / when-to-use
    const llmsRes = await fetch(`${BASE_URL}/llms.txt`);
    const llmsText = await llmsRes.text();
    const hasWhenToUse = llmsText.includes('When to Use This') && llmsText.includes('When NOT to Use This');
    record(
      11,
      'Agent instruction / when-to-use',
      llmsRes.status === 200 && hasWhenToUse,
      `llms.txt status: ${llmsRes.status}, Contains 'When to Use This' & 'When NOT to Use This': ${hasWhenToUse}`
    );

    // 12. Sitemap exists
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    const robotsText = await robotsRes.text();
    const isSitemapOk =
      sitemapRes.status === 200 &&
      sitemapText.includes('<urlset') &&
      sitemapText.includes('https://portfolio-tracker-kishoreabcs-projects.vercel.app');
    const isRobotsOk = robotsRes.status === 200 && robotsText.includes('sitemap.xml');
    record(
      12,
      'Sitemap exists',
      isSitemapOk && isRobotsOk,
      `sitemap.xml status: ${sitemapRes.status} (has <urlset>: ${sitemapText.includes('<urlset')}), robots.txt links sitemap: ${isRobotsOk}`
    );

    // 13. Organization schema completeness
    const orgSchema = Array.isArray(parsedJsonLd)
      ? parsedJsonLd.find((s) => s['@type'] === 'Organization')
      : parsedJsonLd?.['@type'] === 'Organization' ? parsedJsonLd : null;
    const hasOrgComplete = Boolean(
      orgSchema &&
      orgSchema.contactPoint?.email &&
      orgSchema.contactPoint?.telephone &&
      orgSchema.address?.streetAddress
    );
    record(
      13,
      'Organization schema completeness',
      hasOrgComplete,
      `Organization schema found: ${Boolean(orgSchema)}, contactPoint: ${Boolean(orgSchema?.contactPoint)}, address: ${Boolean(orgSchema?.address)}`
    );

    // 14. Trust anchor pages
    const aboutRes = await fetch(`${BASE_URL}/about`);
    const aboutText = stripHtml(await aboutRes.text());
    const contactRes = await fetch(`${BASE_URL}/contact`);
    const contactText = stripHtml(await contactRes.text());
    const privacyRes = await fetch(`${BASE_URL}/privacy`);
    const privacyText = stripHtml(await privacyRes.text());
    const areTrustPagesOk =
      aboutText.length >= 500 && contactText.length >= 500 && privacyText.length >= 500;
    record(
      14,
      'Trust anchor pages',
      areTrustPagesOk,
      `About chars: ${aboutText.length} (>=500), Contact chars: ${contactText.length} (>=500), Privacy chars: ${privacyText.length} (>=500)`
    );

    // 15. Developer resource discoverability
    const predictableUrls = ['/developers', '/docs', '/openapi.json', '/.well-known/mcp', '/llms.txt'];
    let allFound = true;
    for (const u of predictableUrls) {
      const r = await fetch(`${BASE_URL}${u}`);
      if (r.status !== 200) allFound = false;
    }
    record(
      15,
      'Developer resource discoverability',
      allFound,
      `All 5 predictable developer endpoints returned 200 OK: ${allFound}`
    );

    // 16. API schema complexity analysis
    const operations = [];
    for (const [pathKey, pathItem] of Object.entries(openApiData.paths || {})) {
      for (const [method, op] of Object.entries(pathItem)) {
        if (typeof op === 'object' && op !== null) {
          operations.push({ path: pathKey, method, operationId: op.operationId, op });
        }
      }
    }
    const opIds = operations.map((o) => o.operationId).filter(Boolean);
    const uniqueOpIds = new Set(opIds);
    const allHaveOpId = opIds.length === operations.length && uniqueOpIds.size === opIds.length;
    record(
      16,
      'API schema complexity analysis',
      allHaveOpId,
      `Total operations: ${operations.length}, Unique operation IDs: ${uniqueOpIds.size}`
    );

    // 17. Function calling compatibility
    let functionCallingCompatible = true;
    for (const op of operations) {
      if (!op.op.description || !op.op.summary) {
        functionCallingCompatible = false;
      }
    }
    record(
      17,
      'Function calling compatibility',
      functionCallingCompatible,
      `All operations have summaries and descriptions for LLM tool invocation: ${functionCallingCompatible}`
    );

    // 18. Metadata completeness
    const hasCanonical = homeHtml.includes('rel="canonical"');
    const hasOgImage = homeHtml.includes('property="og:image"');
    const hasOgType = homeHtml.includes('property="og:type"');
    const hasHtmlLang = homeHtml.includes('lang="en"');
    const allMetadataSignals = hasCanonical && hasOgImage && hasOgType && hasHtmlLang;
    record(
      18,
      'Metadata completeness',
      allMetadataSignals,
      `canonical: ${hasCanonical}, og:image: ${hasOgImage}, og:type: ${hasOgType}, lang="en": ${hasHtmlLang}`
    );

    // 19. MCP server / manifest & tool calling
    const mcpManifestRes = await fetch(`${BASE_URL}/.well-known/mcp`);
    const mcpManifest = await mcpManifestRes.json();
    const isMcpManifestOk = mcpManifestRes.status === 200 && mcpManifest.name === 'portfolio-dashboard-mcp';

    // Test MCP tool call via JSON-RPC 2.0
    const mcpRpcRes = await fetch(`${BASE_URL}/.well-known/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_market_quotes',
          arguments: { symbols: ['NIFTY 50'] },
        },
      }),
    });
    const mcpRpcData = await mcpRpcRes.json();
    const isToolCallOk = mcpRpcRes.status === 200 && mcpRpcData.result?.content?.[0]?.text;
    record(
      19,
      'MCP server / manifest',
      isMcpManifestOk && Boolean(isToolCallOk),
      `Manifest status: ${mcpManifestRes.status}, JSON-RPC tool call result: ${Boolean(isToolCallOk)}`
    );

    console.log(`\n======================================================`);
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Verification Summary: ${passedCount}/${results.length} PASSED`);
    console.log(`======================================================\n`);

    return passedCount === results.length;
  } catch (err) {
    console.error('Test execution error:', err);
    return false;
  }
}

async function main() {
  console.log(`Launching Next.js production server on port ${PORT}...`);
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE_URL, 20000);
    const success = await runTests();
    serverProcess.kill('SIGTERM');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal test suite error:', error);
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }
}

main();
