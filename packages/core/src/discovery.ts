/**
 * ANS Registry Agent Discovery Engine
 * Discovers agents from multiple sources with filtering and health checking
 */

import { SimpleStorage } from './storage.js';
import type {
  AgentQuery,
  AgentRecord,
  DiscoveryResult,
  DiscoverySource,
  DiscoveredAgent,
  AgentHealthStatus,
  AgentHealthRecord,
  WellKnownDiscoveryOptions,
  GlobalRegistryOptions
} from './types.js';

// Discovery configuration
interface DiscoveryConfig {
  default_timeout: number;
  max_concurrent_requests: number;
  health_check_enabled: boolean;
  cache_ttl: number;
}

const DEFAULT_CONFIG: DiscoveryConfig = {
  default_timeout: 5000,
  max_concurrent_requests: 10,
  health_check_enabled: true,
  cache_ttl: 300000 // 5 minutes
};

let discoveryConfig = { ...DEFAULT_CONFIG };
let storage: SimpleStorage | null = null;

/**
 * Initialize storage (lazy loading)
 */
function getStorage(): SimpleStorage {
  if (!storage) {
    storage = new SimpleStorage();
  }
  return storage;
}

/**
 * Configure discovery settings
 */
export function configureDiscovery(config: Partial<DiscoveryConfig>): void {
  discoveryConfig = { ...discoveryConfig, ...config };
}

/**
 * Main agent discovery function
 * Searches across multiple sources and returns filtered results
 */
export async function discoverAgents(query: AgentQuery = {}): Promise<DiscoveryResult> {
  const startTime = Date.now();
  const sources: DiscoverySource[] = [];
  let allAgents: DiscoveredAgent[] = [];
  
  // Default query options
  const searchQuery: Required<AgentQuery> = {
    capabilities: query.capabilities || [],
    organization: query.organization || '',
    status: query.status || ['active'],
    discovery_level: query.discovery_level || ['public', 'internal', 'private'],
    health_status: query.health_status || ['healthy', 'degraded'],
    include_local: query.include_local !== false, // default true
    include_wellknown: query.include_wellknown || false,
    include_global: query.include_global || false,
    limit: query.limit || 100,
    search: query.search || '',
    type: query.type || ['persistent', 'ephemeral', 'system', 'personal'],
    min_health_score: query.min_health_score || 0
  };

  // 1. Discover from local storage
  if (searchQuery.include_local) {
    try {
      const localResult = await discoverFromLocal(searchQuery);
      sources.push(localResult.source);
      allAgents.push(...localResult.agents);
    } catch (error) {
      sources.push({
        name: 'local-storage',
        type: 'local',
        agents_found: 0,
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 2. Discover from well-known sources
  if (searchQuery.include_wellknown) {
    try {
      const wellKnownResult = await discoverFromWellKnown(searchQuery);
      sources.push(wellKnownResult.source);
      allAgents.push(...wellKnownResult.agents);
    } catch (error) {
      sources.push({
        name: 'well-known',
        type: 'wellknown',
        agents_found: 0,
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 3. Discover from global registry
  if (searchQuery.include_global) {
    try {
      const globalResult = await discoverFromGlobalRegistry(searchQuery);
      sources.push(globalResult.source);
      allAgents.push(...globalResult.agents);
    } catch (error) {
      sources.push({
        name: 'global-registry',
        type: 'global',
        agents_found: 0,
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 4. Filter and deduplicate results
  const filteredAgents = await filterAndDeduplicateAgents(allAgents, searchQuery);
  
  // 5. Health check if enabled
  let healthCheckedAgents = filteredAgents;
  let healthCheckCount = 0;
  if (discoveryConfig.health_check_enabled && filteredAgents.length > 0) {
    const healthResult = await performHealthChecks(filteredAgents);
    healthCheckedAgents = healthResult.agents;
    healthCheckCount = healthResult.checked_count;
  }

  // 6. Apply final filters (health score, limit)
  const finalAgents = applyFinalFilters(healthCheckedAgents, searchQuery);

  const queryTime = Date.now() - startTime;
  
  return {
    agents: finalAgents.map(agent => ({ ...agent, discovery_source: undefined } as AgentRecord)),
    sources,
    total_found: allAgents.length,
    query_time_ms: queryTime,
    metadata: {
      local_agents: sources.find(s => s.type === 'local')?.agents_found || 0,
      wellknown_agents: sources.find(s => s.type === 'wellknown')?.agents_found || 0,
      global_agents: sources.find(s => s.type === 'global')?.agents_found || 0,
      filtered_out: allAgents.length - finalAgents.length,
      health_checked: healthCheckCount
    }
  };
}

/**
 * Discover agents from local storage
 */
async function discoverFromLocal(query: Required<AgentQuery>): Promise<{
  agents: DiscoveredAgent[];
  source: DiscoverySource;
}> {
  const startTime = Date.now();
  const storage = getStorage();
  
  try {
    const storageAgents = storage.listAgents();
    const agents: DiscoveredAgent[] = storageAgents.map(storageAgent => ({
      agent_uri: storageAgent.agent_uri,
      endpoint: storageAgent.endpoint,
      status: storageAgent.status === 'maintenance' ? 'suspended' : storageAgent.status,
      capabilities: storageAgent.capabilities || [],
      version: storageAgent.version,
      metadata: {
        version: storageAgent.version,
        description: storageAgent.metadata?.description,
        contact: storageAgent.metadata?.owner,
        created: storageAgent.metadata?.created_at,
        organization: storageAgent.metadata?.tags?.find(t => t.startsWith('org:'))?.replace('org:', ''),
        discovery_level: storageAgent.metadata?.discovery_level
      },
      resolution: {
        ttl: storageAgent.ttl || 300,
        cached: false,
        resolver: 'local-storage',
        resolved_at: new Date().toISOString(),
        method: 'persistent-storage'
      },
      type: 'persistent',
      discovery_source: {
        name: 'local-storage',
        type: 'local',
        agents_found: storageAgents.length,
        response_time_ms: Date.now() - startTime
      }
    }));

    return {
      agents,
      source: {
        name: 'local-storage',
        type: 'local',
        agents_found: agents.length,
        response_time_ms: Date.now() - startTime
      }
    };
  } catch (error) {
    throw new Error(`Local storage discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Discover agents from well-known sources
 */
async function discoverFromWellKnown(query: Required<AgentQuery>, options: WellKnownDiscoveryOptions = {}): Promise<{
  agents: DiscoveredAgent[];
  source: DiscoverySource;
}> {
  const startTime = Date.now();
  const agents: DiscoveredAgent[] = [];
  
  // Extract unique domains from query or use provided domains
  const domains = options.domains || extractDomainsFromQuery(query);
  const timeout = options.timeout || discoveryConfig.default_timeout;
  
  const wellKnownPromises = domains.map(async (domain) => {
    try {
      const wellKnownUrl = domain.startsWith('http') ? 
        `${domain}/.well-known/agent.json` : 
        `https://${domain}/.well-known/agent.json`;
        
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(wellKnownUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      if (!data.agents || !Array.isArray(data.agents)) return [];
      
      return data.agents.map((agent: any): DiscoveredAgent => ({
        agent_uri: agent.agent_uri,
        endpoint: agent.endpoint,
        status: agent.status || 'active',
        capabilities: agent.capabilities || [],
        metadata: agent.metadata,
        resolution: {
          ttl: 300,
          cached: false,
          resolver: 'well-known',
          resolved_at: new Date().toISOString(),
          method: 'well-known',
          source: wellKnownUrl
        },
        type: agent.type || 'persistent',
        discovery_source: {
          name: `well-known-${domain}`,
          type: 'wellknown',
          url: wellKnownUrl,
          agents_found: 0, // Will be updated
          response_time_ms: 0 // Will be updated
        }
      }));
    } catch (error) {
      return [];
    }
  });
  
  const results = await Promise.all(wellKnownPromises);
  const flatResults = results.flat();
  
  flatResults.forEach(agent => {
    agents.push(agent);
  });
  
  return {
    agents,
    source: {
      name: 'well-known',
      type: 'wellknown',
      agents_found: agents.length,
      response_time_ms: Date.now() - startTime
    }
  };
}

/**
 * Discover agents from global registry
 */
async function discoverFromGlobalRegistry(query: Required<AgentQuery>, options: GlobalRegistryOptions = {}): Promise<{
  agents: DiscoveredAgent[];
  source: DiscoverySource;
}> {
  const startTime = Date.now();
  
  // For v0.1, return empty array - will be implemented when global registry is ready
  return {
    agents: [],
    source: {
      name: 'global-registry',
      type: 'global',
      url: options.registry_url || 'https://registry.ansregistry.org',
      agents_found: 0,
      response_time_ms: Date.now() - startTime,
      error: 'Global registry not yet implemented'
    }
  };
}

/**
 * Filter and deduplicate agents based on query
 */
async function filterAndDeduplicateAgents(agents: DiscoveredAgent[], query: Required<AgentQuery>): Promise<DiscoveredAgent[]> {
  // Deduplicate by agent_uri (prefer local > wellknown > global)
  const deduplicatedMap = new Map<string, DiscoveredAgent>();
  
  // Process in priority order
  const sourceTypePriority: Record<string, number> = { 'local': 1, 'wellknown': 2, 'global': 3, 'cache': 4 };
  
  agents.sort((a, b) => {
    const aPriority = sourceTypePriority[a.discovery_source.type] || 99;
    const bPriority = sourceTypePriority[b.discovery_source.type] || 99;
    return aPriority - bPriority;
  });
  
  for (const agent of agents) {
    if (!deduplicatedMap.has(agent.agent_uri)) {
      deduplicatedMap.set(agent.agent_uri, agent);
    }
  }
  
  const deduplicated = Array.from(deduplicatedMap.values());
  
  // Apply filters
  return deduplicated.filter(agent => {
    // Status filter
    if (!query.status.includes(agent.status)) return false;
    
    // Discovery level filter
    if (agent.metadata?.discovery_level && 
        !query.discovery_level.includes(agent.metadata.discovery_level)) return false;
    
    // Type filter
    if (agent.type && !query.type.includes(agent.type)) return false;
    
    // Capabilities filter (AND logic)
    if (query.capabilities.length > 0) {
      const agentCapabilities = agent.capabilities || [];
      if (!query.capabilities.every(cap => agentCapabilities.includes(cap))) return false;
    }
    
    // Organization filter
    if (query.organization && agent.metadata?.organization !== query.organization) return false;
    
    // Search filter (text search in URI, description, capabilities)
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      const searchableText = [
        agent.agent_uri,
        agent.metadata?.description || '',
        ...(agent.capabilities || [])
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) return false;
    }
    
    return true;
  });
}

/**
 * Perform health checks on agents
 */
async function performHealthChecks(agents: DiscoveredAgent[]): Promise<{
  agents: DiscoveredAgent[];
  checked_count: number;
}> {
  // For v0.1, return agents as-is with mock health status
  // Real health checks will be implemented in health.ts
  const healthCheckedAgents = agents.map(agent => ({
    ...agent,
    health: {
      status: 'healthy' as const,
      score: 95,
      last_check: new Date().toISOString(),
      error_count: 0,
      uptime_percentage: 99.5
    }
  }));
  
  return {
    agents: healthCheckedAgents,
    checked_count: agents.length
  };
}

/**
 * Apply final filters (health score, limit)
 */
function applyFinalFilters(agents: DiscoveredAgent[], query: Required<AgentQuery>): DiscoveredAgent[] {
  let filtered = agents;
  
  // Health status filter
  if (query.health_status.length > 0) {
    filtered = filtered.filter(agent => 
      !agent.health || query.health_status.includes(agent.health.status)
    );
  }
  
  // Minimum health score filter
  if (query.min_health_score > 0) {
    filtered = filtered.filter(agent => 
      !agent.health || agent.health.score >= query.min_health_score
    );
  }
  
  // Apply limit
  if (query.limit > 0) {
    filtered = filtered.slice(0, query.limit);
  }
  
  return filtered;
}

/**
 * Extract domains from query for well-known discovery
 */
function extractDomainsFromQuery(query: Required<AgentQuery>): string[] {
  const domains: string[] = [];
  
  // Add organization domain if specified
  if (query.organization) {
    domains.push(query.organization);
  }
  
  // Add common domains for discovery (could be configurable)
  domains.push('ansregistry.org', 'demo.ansregistry');
  
  return [...new Set(domains)]; // Remove duplicates
}

/**
 * Search agents with a simple text query
 */
export async function searchAgents(searchText: string, options: Partial<AgentQuery> = {}): Promise<DiscoveryResult> {
  return discoverAgents({
    ...options,
    search: searchText,
    include_local: true,
    include_wellknown: true
  });
}

/**
 * Find agents by capabilities
 */
export async function findAgentsByCapabilities(capabilities: string[], options: Partial<AgentQuery> = {}): Promise<DiscoveryResult> {
  return discoverAgents({
    ...options,
    capabilities,
    include_local: true,
    include_wellknown: true
  });
}

/**
 * Get healthy agents only
 */
export async function getHealthyAgents(options: Partial<AgentQuery> = {}): Promise<DiscoveryResult> {
  return discoverAgents({
    ...options,
    health_status: ['healthy'],
    min_health_score: 80,
    include_local: true
  });
} 