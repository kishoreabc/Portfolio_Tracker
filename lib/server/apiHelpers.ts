import { NextResponse } from 'next/server';

/**
 * Standard Cache-Control headers for private, user-specific data
 * that must never be cached by shared caches or proxies.
 */
export const privateNoStoreHeaders: Record<string, string> = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * Standard 405 Method Not Allowed response with Allow header.
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse {
  return NextResponse.json(
    { error: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}` },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(', '),
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Logs the full error details to the server console,
 * but returns a safe, sanitized generic error message to the client.
 */
export function safeErrorResponse(
  context: string,
  err: unknown,
  clientMessage = 'Unable to process request',
  status = 500
): NextResponse {
  const detailed = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
  console.error(`[${context}] Error:`, detailed);

  return NextResponse.json(
    { error: clientMessage },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Standard 401 Unauthorized response.
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Standard 403 Forbidden response.
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 403,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
