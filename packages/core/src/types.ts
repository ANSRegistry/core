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
  // Storage-specific metadata
  owner?: string;
  created_at?: string;
  updated_at?: string;
  discovery_level?: 'public' | 'internal' | 'private';
}

export interface ResolutionInfo {
  ttl: number;
  cached: boolean;
  resolver: string;
  resolved_at: string;
  method?: 'registry' | 'well-known' | 'dns' | 'cache' | 'internal-config' | 'internal-registry' | 'internal-well-known' | 'persistent-storage';
  source?: string;
}

export interface AgentRecord {
  agent_uri: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'suspended' | 'maintenance';
  capabilities?: string[];
  metadata?: AgentMetadata;
  resolution?: ResolutionInfo;
  type?: 'persistent' | 'ephemeral' | 'system' | 'personal';
  version?: string;
  ttl?: number;
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

// Storage-specific types
export interface StorageAgentRecord {
  agent_uri: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'maintenance';
  capabilities?: string[];
  version?: string;
  metadata?: {
    description?: string;
    owner?: string;
    created_at: string;
    updated_at: string;
    tags?: string[];
    discovery_level?: 'public' | 'internal' | 'private';
  };
  ttl?: number;
}

export interface RegistryConfig {
  version: string;
  settings: {
    default_ttl: number;
    max_cache_size: number;
    enable_health_checks: boolean;
    log_level: 'debug' | 'info' | 'warn' | 'error';
  };
  well_known_sources: string[];
  dns_servers?: string[];
  created_at: string;
  updated_at: string;
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

// ========================
// Agent Discovery Types
// ========================

export interface AgentQuery {
  /** Capabilities to search for (AND logic) */
  capabilities?: string[];
  /** Organization/domain filter */
  organization?: string;
  /** Status filter */
  status?: ('active' | 'inactive' | 'suspended' | 'maintenance')[];
  /** Discovery level filter */
  discovery_level?: ('public' | 'internal' | 'private')[];
  /** Health status filter */
  health_status?: ('healthy' | 'degraded' | 'unhealthy')[];
  /** Include local storage agents */
  include_local?: boolean;
  /** Include well-known discovery */
  include_wellknown?: boolean;
  /** Include global registry agents */
  include_global?: boolean;
  /** Maximum number of results */
  limit?: number;
  /** Search query for text matching */
  search?: string;
  /** Agent type filter */
  type?: ('persistent' | 'ephemeral' | 'system' | 'personal')[];
  /** Minimum required health score (0-100) */
  min_health_score?: number;
}

export interface DiscoveryResult {
  agents: AgentRecord[];
  sources: DiscoverySource[];
  total_found: number;
  query_time_ms: number;
  metadata: {
    local_agents: number;
    wellknown_agents: number;
    global_agents: number;
    filtered_out: number;
    health_checked: number;
  };
}

export interface DiscoverySource {
  name: string;
  type: 'local' | 'wellknown' | 'global' | 'cache';
  url?: string;
  agents_found: number;
  response_time_ms: number;
  error?: string;
}

export interface AgentHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  last_check: string;
  response_time_ms?: number;
  error_count: number;
  uptime_percentage: number;
  details?: {
    endpoint_reachable: boolean;
    response_time_ok: boolean;
    error_rate_ok: boolean;
    capacity_ok?: boolean;
  };
}

export interface AgentHealthRecord extends AgentRecord {
  health?: AgentHealthStatus;
}

export interface WellKnownDiscoveryOptions {
  /** Domains to check for .well-known/agent.json */
  domains?: string[];
  /** Timeout per domain (ms) */
  timeout?: number;
  /** Whether to verify SSL certificates */
  verify_ssl?: boolean;
  /** Follow redirects */
  follow_redirects?: boolean;
}

export interface GlobalRegistryOptions {
  /** Registry endpoint URL */
  registry_url?: string;
  /** API key for authenticated requests */
  api_key?: string;
  /** Organization filter */
  organization?: string;
  /** Request timeout (ms) */
  timeout?: number;
}

// Utility type for discovery functions
export type DiscoveryFunction = (query: AgentQuery) => Promise<AgentRecord[]>;

// Extended agent record with discovery metadata
export interface DiscoveredAgent extends AgentRecord {
  discovery_source: DiscoverySource;
  health?: AgentHealthStatus;
  relevance_score?: number; // 0-100 based on query match
}