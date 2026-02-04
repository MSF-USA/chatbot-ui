import { NextRequest, NextResponse } from 'next/server';

import { CheckLevel, HealthCheckService } from '@/lib/services/health';

/**
 * Valid check levels for the health endpoint.
 */
const VALID_CHECK_LEVELS: CheckLevel[] = ['live', 'ready', 'deep'];

/**
 * Determines if a check level is valid.
 *
 * @param level - The level to validate
 * @returns True if the level is valid
 */
function isValidCheckLevel(level: string | null): level is CheckLevel {
  return level !== null && VALID_CHECK_LEVELS.includes(level as CheckLevel);
}

/**
 * Health Check API Endpoint
 *
 * Supports tiered health checks for monitoring Azure service dependencies.
 *
 * Query Parameters:
 * - `check`: The level of health check to perform
 *   - `live` (default): Simple liveness check, returns "OK"
 *   - `ready`: Checks critical services (Azure OpenAI, Azure Search)
 *   - `deep`: Checks all Azure services including non-critical ones
 *
 * Response Codes:
 * - 200: All checks pass (healthy) or some non-critical fail (degraded)
 * - 503: Critical checks fail (unhealthy)
 *
 * @example
 * GET /api/health           - Returns "OK"
 * GET /api/health?check=live  - Returns "OK"
 * GET /api/health?check=ready - Returns JSON with critical service checks
 * GET /api/health?check=deep  - Returns JSON with all service checks
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkParam = searchParams.get('check');

  // Default to 'live' if no check parameter provided
  const level: CheckLevel =
    checkParam === null
      ? 'live'
      : isValidCheckLevel(checkParam)
        ? checkParam
        : 'live';

  // For liveness check, just return "OK" for backward compatibility
  if (level === 'live') {
    return new NextResponse('OK', { status: 200 });
  }

  // Perform the health check
  const healthService = HealthCheckService.getInstance();
  const result = await healthService.check(level);

  // Determine HTTP status code based on health status
  const statusCode = result.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(result, { status: statusCode });
}
