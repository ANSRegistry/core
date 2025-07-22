/**
 * ANS Registry Core Resolver v0.1
 * Resolve agent:// URIs to service endpoints
 */

export interface AgentRecord {
  agent_uri: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'suspended';
  capabilities?: string[];
  metadata?: {
    version?: string;
    organization?: string;
    description?: string;
    contact?: string;
    created?: string;
    expires?: string;
  };
  resolution?: {
    ttl: number;
    cached: boolean;
    resolver: string;
    resolved_at: string;
    method?: 'registry' | 'well-known' | 'dns' | 'cache' | 'internal-config' | 'internal-registry' | 'internal-well-known';
    source?: string;
  };
  type?: 'persistent' | 'ephemeral' | 'system' | 'personal';
}

export interface ResolutionError {
  error: string;
  code: number;
  message: string;
  agent_uri: string;
}

// Enhanced registry with internal agents support
const INTERNAL_AGENTS: Record<string, AgentRecord> = {
  'agent://hr.internal.company.local': {
    agent_uri: 'agent://hr.internal.company.local',
    endpoint: 'https://hr-system.company.local:8080/agent',
    status: 'active',
    capabilities: ['hr', 'benefits', 'payroll', 'internal'],
    metadata: {
      organization: 'Company Corp',
      description: 'Internal HR agent for employee services',
      contact: 'hr@company.local',
      version: '1.0.0'
    },
    resolution: {
      ttl: 3600,
      cached: false,
      resolver: 'internal-config',
      resolved_at: new Date().toISOString()
    }
  },
  'agent://it-support.internal.company.local': {
    agent_uri: 'agent://it-support.internal.company.local',
    endpoint: 'https://helpdesk.company.local/agent',
    status: 'active',
    capabilities: ['it', 'support', 'troubleshooting', 'internal'],
    metadata: {
      organization: 'Company Corp IT',
      description: 'Internal IT support agent',
      contact: 'it-support@company.local',
      version: '1.0.0'
    },
    resolution: {
      ttl: 3600,
      cached: false,
      resolver: 'internal-config',
      resolved_at: new Date().toISOString()
    }
  },
  'agent://admin.internal.company.local': {
    agent_uri: 'agent://admin.internal.company.local',
    endpoint: 'https://admin-panel.company.local/agent',
    status: 'active',
    capabilities: ['admin', 'user-management', 'internal'],
    metadata: {
      organization: 'Company Corp Admin',
      description: 'Internal administration agent',
      contact: 'admin@company.local',
      version: '1.0.0'
    },
    resolution: {
      ttl: 3600,
      cached: false,
      resolver: 'internal-config',
      resolved_at: new Date().toISOString()
    }
  }
};
const DEMO_REGISTRY: Record<string, AgentRecord> = {
  'agent://hello.dev.pbolduc': {
    agent_uri: 'agent://hello.dev.pbolduc',
    endpoint: 'https://api.ansregistry.org/demo/hello',
    status: 'active',
    capabilities: ['chat', 'demo'],
    metadata: {
      version: '0.1.0',
      organization: 'ANS Registry',
      description: 'Demo agent for ANS protocol development',
      contact: 'philippe@ansregistry.org',
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    resolution: {
      ttl: 300,
      cached: false,
      resolver: 'ansregistry.org',
      resolved_at: new Date().toISOString()
    }
  },
  'agent://support.demo.ansregistry': {
    agent_uri: 'agent://support.demo.ansregistry',
    endpoint: 'https://api.ansregistry.org/demo/support',
    status: 'active',
    capabilities: ['support', 'faq', 'documentation'],
    metadata: {
      version: '1.0.0',
      organization: 'ANS Registry',
      description: 'Customer support agent for ANS Registry',
      contact: 'support@ansregistry.org',
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  'agent://test.local': {
    agent_uri: 'agent://test.local',
    endpoint: 'https://localhost:3000/agent',
    status: 'active',
    capabilities: ['test', 'development'],
    metadata: {
      version: '0.1.0',
      description: 'Local development test agent',
      created: new Date().toISOString()
    }
  }
};

export interface InternalAgentConfig {
  internalRegistry?: Record<string, AgentRecord>;
  internalWellKnownSources?: string[];
  useInternalAgents?: boolean;
}

/**
 * Global configuration for internal agents
 */
let globalInternalConfig: InternalAgentConfig = {
  useInternalAgents: true,
  internalRegistry: {},
  internalWellKnownSources: []
};

/**
 * Configure internal agents resolution
 */
export function configureInternalAgents(config: InternalAgentConfig): void {
  globalInternalConfig = { ...globalInternalConfig, ...config };
}

/**
 * Register an internal agent at runtime
 */
export function registerInternalAgent(uri: string, agent: Partial<AgentRecord>): void {
  if (!globalInternalConfig.internalRegistry) {
    globalInternalConfig.internalRegistry = {};
  }
  
  const agentRecord: AgentRecord = {
    agent_uri: uri,
    endpoint: agent.endpoint || '',
    status: agent.status || 'active',
    capabilities: agent.capabilities || [],
    resolution: {
      ttl: 3600,
      cached: false,
      resolver: 'internal-registry',
      resolved_at: new Date().toISOString()
    }
  };

  // Only add metadata if provided
  if (agent.metadata) {
    agentRecord.metadata = agent.metadata;
  }

  // Add type if provided
  if (agent.type) {
    agentRecord.type = agent.type;
  }

  globalInternalConfig.internalRegistry[uri] = agentRecord;
}
function validateAgentURI(uri: string): boolean {
  // Check basic requirements
  if (!uri || typeof uri !== 'string' || uri.length === 0 || uri.length > 253) {
    return false;
  }
  
  // Must start with agent://
  if (!uri.startsWith('agent://')) {
    return false;
  }
  
  // Basic format check - must have at least one dot after agent://
  const pattern = /^agent:\/\/([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!pattern.test(uri)) {
    return false;
  }
  
  // Check each component doesn't start or end with hyphen
  const hostname = uri.replace('agent://', '');
  const parts = hostname.split('.');
  
  // Must have at least 2 parts (name.tld)
  if (parts.length < 2) {
    return false;
  }
  
  for (const part of parts) {
    if (part.startsWith('-') || part.endsWith('-') || part.length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Parse agent URI into components
 */
function parseAgentURI(uri: string) {
  const match = uri.match(/^agent:\/\/(.+)$/);
  if (!match || !match[1]) return null; // 🔧 Ajout vérification match[1]
  
  const hostname = match[1];
  const parts = hostname.split('.');
  
  return {
    full: hostname,
    agent_name: parts[0],
    service: parts.length > 2 ? parts[1] : undefined,
    organization: parts.slice(parts.length > 2 ? 2 : 1).join('.')
  };
}

/**
 * Try to resolve via .well-known/agent.json
 */
async function resolveViaWellKnown(uri: string): Promise<AgentRecord | null> {
  try {
    const parsed = parseAgentURI(uri);
    if (!parsed) return null;
    
    const wellKnownUrl = `https://${parsed.organization}/.well-known/agent.json`;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(wellKnownUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const agent = data.agents?.find((a: any) => a.agent_uri === uri);
    
    if (agent) {
      return {
        ...agent,
        resolution: {
          ttl: 300,
          cached: false,
          resolver: 'well-known',
          resolved_at: new Date().toISOString()
        }
      };
    }
  } catch (error) {
    // Silently fail for .well-known lookup
    // console.debug(`Well-known lookup failed for ${uri}:`, error);
  }
  
  return null;
}

/**
 * Try to resolve via internal well-known source
 */
async function resolveViaInternalWellKnown(uri: string, source: string): Promise<AgentRecord | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(source, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const agent = data.agents?.find((a: any) => a.agent_uri === uri);
    
    if (agent) {
      const agentRecord: AgentRecord = {
        agent_uri: agent.agent_uri,
        endpoint: agent.endpoint,
        status: agent.status || 'active',
        capabilities: agent.capabilities || [],
        resolution: {
          ttl: 300,
          cached: false,
          resolver: 'internal-well-known',
          resolved_at: new Date().toISOString(),
          method: 'internal-well-known',
          source: source
        }
      };

      // Add optional properties if they exist
      if (agent.metadata) {
        agentRecord.metadata = agent.metadata;
      }
      if (agent.type) {
        agentRecord.type = agent.type as 'persistent' | 'ephemeral' | 'system' | 'personal';
      }

      return agentRecord;
    }
  } catch (error) {
    // console.debug(`Internal well-known source ${source} failed:`, error);
  }
  
  return null;
}
async function resolveViaDNS(_uri: string): Promise<AgentRecord | null> {
  // DNS resolution would require a DNS client
  // For v0.1, we'll simulate this or skip
  return null;
}

/**
 * Main resolution function
 */
export async function resolve(uri: string): Promise<AgentRecord | ResolutionError> {
  // Validate URI format FIRST
  if (!uri || !validateAgentURI(uri)) {
    return {
      error: 'Invalid URI format',
      code: 400,
      message: 'Invalid URI format. Agent URI must follow format: agent://[agent-name].[service].[organization].[tld]',
      agent_uri: uri
    };
  }

  // Try demo registry first (for v0.1 demo agents)
  if (DEMO_REGISTRY[uri]) {
    return {
      ...DEMO_REGISTRY[uri],
      resolution: {
        ...DEMO_REGISTRY[uri].resolution!,
        resolved_at: new Date().toISOString()
      }
    };
  }

  // Try internal agents registry
  if (globalInternalConfig.useInternalAgents && INTERNAL_AGENTS[uri]) {
    return {
      ...INTERNAL_AGENTS[uri],
      resolution: {
        ...INTERNAL_AGENTS[uri].resolution!,
        resolved_at: new Date().toISOString()
      }
    };
  }

  // Try runtime-registered internal agents
  if (globalInternalConfig.internalRegistry && globalInternalConfig.internalRegistry[uri]) {
    const agent = globalInternalConfig.internalRegistry[uri];
    return {
      ...agent,
      resolution: {
        ttl: agent.resolution?.ttl || 300,
        cached: agent.resolution?.cached || false,
        resolver: agent.resolution?.resolver || 'internal-registry',
        resolved_at: new Date().toISOString()
      }
    };
  }

  // Try internal well-known sources
  if (globalInternalConfig.internalWellKnownSources && globalInternalConfig.internalWellKnownSources.length > 0) {
    for (const source of globalInternalConfig.internalWellKnownSources) {
      const result = await resolveViaInternalWellKnown(uri, source);
      if (result) {
        return result;
      }
    }
  }

  // Try .well-known resolution (public agents)
  const wellKnownResult = await resolveViaWellKnown(uri);
  if (wellKnownResult) {
    return wellKnownResult;
  }

  // Try DNS resolution (placeholder for v0.1)
  const dnsResult = await resolveViaDNS(uri);
  if (dnsResult) {
    return dnsResult;
  }

  // Not found
  return {
    error: 'Agent not found',
    code: 404,
    message: `Agent ${uri} is not registered or not resolvable`,
    agent_uri: uri
  };
}

/**
 * Batch resolution for multiple agents
 */
export async function resolveBatch(uris: string[]): Promise<(AgentRecord | ResolutionError)[]> {
  const results = await Promise.all(uris.map(uri => resolve(uri)));
  return results;
}

/**
 * Simple caching wrapper
 */
class SimpleCache {
  private cache = new Map<string, { data: AgentRecord; expires: number }>();

  set(key: string, data: AgentRecord, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  get(key: string): AgentRecord | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return {
      ...entry.data,
      resolution: {
        ...entry.data.resolution!,
        cached: true,
        resolved_at: new Date().toISOString()
      }
    };
  }

  clear() {
    this.cache.clear();
  }
}

// Global cache instance
const cache = new SimpleCache();

/**
 * Cached resolution function
 */
export async function resolveCached(uri: string): Promise<AgentRecord | ResolutionError> {
  // Check cache first
  const cached = cache.get(uri);
  if (cached) {
    return cached;
  }

  // Resolve and cache
  const result = await resolve(uri);
  if ('endpoint' in result) {
    cache.set(uri, result, result.resolution?.ttl || 300);
  }

  return result;
}

/**
 * Health check for resolver
 */
export async function health(): Promise<{ status: string; timestamp: string; version: string }> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  };
}

// Export for testing
export { DEMO_REGISTRY, validateAgentURI, parseAgentURI };