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
 * Formats a structured JSON error payload meeting both AI agent criteria
 * (error code, message, resolution hint) and backwards-compatible client expectations.
 */
export function formatJsonError(code: string, message: string, resolutionHint: string) {
  return {
    error: {
      code,
      message,
      resolution_hint: resolutionHint,
    },
    code,
    message,
    resolution_hint: resolutionHint,
  };
}

/**
 * Standard 405 Method Not Allowed response with Allow header.
 */
export function methodNotAllowed(allowedMethods: string[]): NextResponse {
  const message = `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`;
  const resolutionHint = `Submit the request using one of the supported HTTP methods: ${allowedMethods.join(', ')}.`;

  return NextResponse.json(
    formatJsonError('METHOD_NOT_ALLOWED', message, resolutionHint),
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

  const code = status === 400 ? 'BAD_REQUEST' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR';
  const resolutionHint = status === 400
    ? 'Check the request syntax, parameters, and payload formatting.'
    : status === 404
      ? 'Verify the endpoint URL and path parameters.'
      : 'Verify request parameters or retry in a few moments. Contact support if the issue persists.';

  return NextResponse.json(
    formatJsonError(code, clientMessage, resolutionHint),
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
    formatJsonError(
      'UNAUTHORIZED',
      message,
      'Authentication is required to access this resource. Please sign in via /login or provide a valid API credential.'
    ),
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
    formatJsonError(
      'FORBIDDEN',
      message,
      'You do not have sufficient permissions to access this resource.'
    ),
    {
      status: 403,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Standard 404 Not Found JSON response.
 */
export function notFoundResponse(
  message = 'Resource not found',
  resolutionHint = 'Verify that the endpoint path and query parameters are correct. Refer to /openapi.json or /docs for available endpoints.'
): NextResponse {
  return NextResponse.json(
    formatJsonError('NOT_FOUND', message, resolutionHint),
    {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
