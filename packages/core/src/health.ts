/**
 * ANS Registry Agent Health Monitoring
 * Health checks, uptime tracking, and performance monitoring
 */

import type {
  AgentRecord,
  AgentHealthStatus,
  AgentHealthRecord
} from './types.js';

// Health check configuration
interface HealthConfig {
  check_timeout: number;
  concurrent_checks: number;
  retry_attempts: number;
  cache_duration: number;
  health_endpoints: {
    path: string;
    method: 'GET' | 'HEAD' | 'POST';
    expected_status: number[];
  }[];
}

const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  check_timeout: 5000,
  concurrent_checks: 5,
  retry_attempts: 3,
  cache_duration: 60000, // 1 minute
  health_endpoints: [
    { path: '/health', method: 'GET', expected_status: [200] },
    { path: '/status', method: 'GET', expected_status: [200] },
    { path: '/', method: 'HEAD', expected_status: [200, 204] }
  ]
};

let healthConfig = { ...DEFAULT_HEALTH_CONFIG };

// Health cache
class HealthCache {
  private cache = new Map<string, { health: AgentHealthStatus; expires: number }>();

  set(agentUri: string, health: AgentHealthStatus): void {
    this.cache.set(agentUri, {
      health,
      expires: Date.now() + healthConfig.cache_duration
    });
  }

  get(agentUri: string): AgentHealthStatus | null {
    const entry = this.cache.get(agentUri);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(agentUri);
      return null;
    }
    
    return entry.health;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const healthCache = new HealthCache();

/**
 * Configure health checking settings
 */
export function configureHealth(config: Partial<HealthConfig>): void {
  healthConfig = { ...healthConfig, ...config };
}

/**
 * Perform health check on a single agent
 */
export async function checkAgentHealth(agent: AgentRecord): Promise<AgentHealthStatus> {
  // Check cache first
  const cachedHealth = healthCache.get(agent.agent_uri);
  if (cachedHealth) {
    return cachedHealth;
  }

  const startTime = Date.now();
  let bestResult: HealthCheckResult | null = null;
  let errorCount = 0;

  // Try each health endpoint
  for (const endpoint of healthConfig.health_endpoints) {
    try {
      const result = await performHealthCheck(agent.endpoint, endpoint);
      if (result.success) {
        bestResult = result;
        break; // Success on first endpoint is good enough
      }
      errorCount++;
    } catch (error) {
      errorCount++;
      continue;
    }
  }

  // If no endpoint succeeded, try the main endpoint with HEAD request
  if (!bestResult) {
    try {
      const result = await performHealthCheck(agent.endpoint, {
        path: '',
        method: 'HEAD',
        expected_status: [200, 204, 405] // 405 = Method Not Allowed is OK for HEAD
      });
      if (result.success) {
        bestResult = result;
      }
    } catch (error) {
      errorCount++;
    }
  }

  const responseTime = Date.now() - startTime;
  const health = buildHealthStatus(bestResult, errorCount, responseTime);
  
  // Cache the result
  healthCache.set(agent.agent_uri, health);
  
  return health;
}

/**
 * Perform health checks on multiple agents concurrently
 */
export async function checkMultipleAgentsHealth(agents: AgentRecord[]): Promise<AgentHealthRecord[]> {
  const chunks = chunkArray(agents, healthConfig.concurrent_checks);
  const results: AgentHealthRecord[] = [];

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (agent): Promise<AgentHealthRecord> => {
      try {
        const health = await checkAgentHealth(agent);
        return { ...agent, health };
      } catch (error) {
        // Return agent with unhealthy status on error
        return {
          ...agent,
          health: {
            status: 'unhealthy',
            score: 0,
            last_check: new Date().toISOString(),
            error_count: 1,
            uptime_percentage: 0,
            details: {
              endpoint_reachable: false,
              response_time_ok: false,
              error_rate_ok: false
            }
          }
        };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Get cached health status for an agent
 */
export function getCachedHealth(agentUri: string): AgentHealthStatus | null {
  return healthCache.get(agentUri);
}

/**
 * Clear health cache
 */
export function clearHealthCache(): void {
  healthCache.clear();
}

/**
 * Get health cache statistics
 */
export function getHealthCacheStats(): {
  cached_agents: number;
  cache_hit_rate: number;
  oldest_entry_age: number;
} {
  // Simple stats for now
  return {
    cached_agents: healthCache.size(),
    cache_hit_rate: 0.85, // Mock value - would be tracked in real implementation
    oldest_entry_age: Date.now() - (Date.now() - 30000) // Mock 30 seconds
  };
}

/**
 * Filter agents by health status
 */
export function filterAgentsByHealth(
  agents: AgentHealthRecord[], 
  criteria: {
    min_score?: number;
    max_response_time?: number;
    required_status?: ('healthy' | 'degraded' | 'unhealthy')[];
    max_error_count?: number;
  }
): AgentHealthRecord[] {
  return agents.filter(agent => {
    if (!agent.health) return false;
    
    const health = agent.health;
    
    // Minimum score filter
    if (criteria.min_score !== undefined && health.score < criteria.min_score) {
      return false;
    }
    
    // Maximum response time filter
    if (criteria.max_response_time !== undefined && 
        health.response_time_ms !== undefined && 
        health.response_time_ms > criteria.max_response_time) {
      return false;
    }
    
    // Status filter
    if (criteria.required_status && !criteria.required_status.includes(health.status)) {
      return false;
    }
    
    // Maximum error count filter
    if (criteria.max_error_count !== undefined && health.error_count > criteria.max_error_count) {
      return false;
    }
    
    return true;
  });
}

// Internal types
interface HealthCheckResult {
  success: boolean;
  status_code?: number;
  response_time: number;
  error?: string;
}

/**
 * Perform a single health check request
 */
async function performHealthCheck(
  baseUrl: string, 
  endpoint: HealthConfig['health_endpoints'][0]
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const url = endpoint.path ? `${baseUrl.replace(/\/$/, '')}${endpoint.path}` : baseUrl;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), healthConfig.check_timeout);
  
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ANS-Registry-Health-Checker/0.1',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const success = endpoint.expected_status.includes(response.status);
    
    return {
      success,
      status_code: response.status,
      response_time: responseTime,
      error: success ? undefined : `Unexpected status ${response.status}`
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      response_time: responseTime,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

/**
 * Build health status from check result
 */
function buildHealthStatus(
  result: HealthCheckResult | null, 
  errorCount: number, 
  totalResponseTime: number
): AgentHealthStatus {
  if (!result || !result.success) {
    return {
      status: 'unhealthy',
      score: 0,
      last_check: new Date().toISOString(),
      response_time_ms: totalResponseTime,
      error_count: errorCount,
      uptime_percentage: 0,
      details: {
        endpoint_reachable: false,
        response_time_ok: false,
        error_rate_ok: false
      }
    };
  }

  // Calculate health score (0-100)
  let score = 100;
  
  // Penalize for response time (>2s = degraded, >5s = unhealthy)
  if (result.response_time > 5000) {
    score -= 50;
  } else if (result.response_time > 2000) {
    score -= 25;
  }
  
  // Penalize for errors during checking
  score -= Math.min(errorCount * 10, 40);
  
  // Determine status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (score >= 80) {
    status = 'healthy';
  } else if (score >= 50) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    score: Math.max(0, score),
    last_check: new Date().toISOString(),
    response_time_ms: result.response_time,
    error_count: errorCount,
    uptime_percentage: score >= 50 ? 99.5 : 85.0, // Mock uptime
    details: {
      endpoint_reachable: true,
      response_time_ok: result.response_time <= 2000,
      error_rate_ok: errorCount <= 1,
      capacity_ok: true // Would be determined by load metrics
    }
  };
}

/**
 * Utility function to chunk array for concurrent processing
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Health monitoring statistics
 */
export function getHealthStats(): {
  total_checks_performed: number;
  healthy_agents: number;
  degraded_agents: number;
  unhealthy_agents: number;
  average_response_time: number;
  cache_stats: ReturnType<typeof getHealthCacheStats>;
} {
  // Mock stats for v0.1 - real implementation would track these metrics
  return {
    total_checks_performed: 150,
    healthy_agents: 12,
    degraded_agents: 3,
    unhealthy_agents: 1,
    average_response_time: 245,
    cache_stats: getHealthCacheStats()
  };
} 