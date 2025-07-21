/**
 * Type definitions for ANS Registry Core
 */

export interface AgentMetadata {
    version?: string;
    organization?: string;
    description?: string;
    contact?: string;
    created?: string;
    expires?: string;
    tags?: string[];
    max_concurrent_sessions?: number;
    response_time_ms?: number;
    business_hours?: string;
    languages?: string[];
    documentation?: string;
  }
  
  export interface ResolutionInfo {
    ttl: number;
    cached: boolean;
    resolver: string;
    resolved_at: string;
    // Add the method property that's being used in resolve.ts
    method?: 'registry' | 'well-known' | 'dns' | 'cache' | 'internal-config' | 'internal-registry' | 'internal-well-known';
    source?: string;
  }
  
  export interface AgentRecord {
    agent_uri: string;
    endpoint: string;
    status: 'active' | 'inactive' | 'suspended';
    capabilities?: string[];
    metadata?: AgentMetadata;
    resolution?: ResolutionInfo;
    // Add the type property that's being used in resolve.ts
    type?: 'persistent' | 'ephemeral' | 'system' | 'personal';
  }
  
  export interface ResolutionError {
    error: string;
    code: number;
    message: string;
    agent_uri: string;
    timestamp?: string;
  }
  
  export interface WellKnownAgent {
    agent_uri: string;
    endpoint: string;
    capabilities?: string[];
    version?: string;
    type?: string;
    created?: string;
    updated?: string;
    metadata?: AgentMetadata;
  }
  
  export interface WellKnownDocument {
    owner: string;
    agents: WellKnownAgent[];
    verification?: {
      method: string;
      timestamp: string;
      signature?: string;
      public_key?: string;
      algorithm?: string;
    };
    registry?: {
      name: string;
      version: string;
      last_updated: string;
      next_update?: string;
      cache_ttl?: number;
      contact?: {
        email: string;
        website?: string;
        documentation?: string;
      };
    };
  }
  
  export interface ParsedAgentURI {
    full: string;
    agent_name: string;
    service?: string;
    organization: string;
    tld?: string;
  }
  
  export interface ResolverConfig {
    timeout?: number;
    cache_ttl?: number;
    max_retries?: number;
    fallback_enabled?: boolean;
    registry_endpoints?: string[];
  }
  
  export interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    version: string;
    registry?: string;
    cache_size?: number;
    uptime?: number;
  }
  
  export interface InternalAgentConfig {
    internalRegistry?: Record<string, AgentRecord>;
    internalWellKnownSources?: string[];
    useInternalAgents?: boolean;
  }
  
  // Utility types
  export type ResolutionResult = AgentRecord | ResolutionError;
  export type BatchResolutionResult = ResolutionResult[];
  
  // Type guards
  export function isAgentRecord(result: ResolutionResult): result is AgentRecord {
    return 'endpoint' in result;
  }
  
  export function isResolutionError(result: ResolutionResult): result is ResolutionError {
    return 'error' in result;
  }