/**
 * ANS Registry Core v0.1
 * Universal naming for AI agents
 * 
 * @author Philippe Bolduc <philippe@ansregistry.org>
 * @license MIT
 * @homepage https://ansregistry.org
 * @repository https://github.com/ANSRegistry/core
 */

// Core resolution functions
export {
  resolve,
  resolveBatch,
  resolveCached,
  health,
  validateAgentURI,
  parseAgentURI,
  configureInternalAgents,
  registerInternalAgent,
  listPersistentAgents,
  removePersistentAgent,
  clearPersistentAgents,
  DEMO_REGISTRY
} from './resolve';

// Agent Discovery functions
export {
  discoverAgents,
  searchAgents,
  findAgentsByCapabilities,
  getHealthyAgents,
  configureDiscovery
} from './discovery';

// Health Monitoring functions
export {
  checkAgentHealth,
  checkMultipleAgentsHealth,
  getCachedHealth,
  clearHealthCache,
  getHealthCacheStats,
  filterAgentsByHealth,
  getHealthStats,
  configureHealth
} from './health';

// Storage and persistence functions
export {
  SimpleStorage
} from './storage';

// Type definitions
export type {
  AgentRecord,
  ResolutionError,
  InternalAgentConfig,
  AgentMetadata,
  ResolutionInfo,
  WellKnownAgent,
  WellKnownDocument,
  ParsedAgentURI,
  ResolverConfig,
  HealthStatus,
  ResolutionResult,
  BatchResolutionResult,
  // Agent Discovery types
  AgentQuery,
  DiscoveryResult,
  DiscoverySource,
  DiscoveredAgent,
  AgentHealthStatus,
  AgentHealthRecord,
  WellKnownDiscoveryOptions,
  GlobalRegistryOptions,
  DiscoveryFunction
} from './types';

// Type guards
export {
  isAgentRecord,
  isResolutionError
} from './types';

// Version and metadata
export const VERSION = '0.1.0';
export const REGISTRY_AUTHORITY = 'ansregistry.org';

// Default configuration
export const DEFAULT_CONFIG = {
  timeout: 5000,
  cache_ttl: 300,
  max_retries: 3,
  fallback_enabled: true
} as const;