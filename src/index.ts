/**
 * ANS Registry Core v0.1
 * Universal naming for AI agents
 * 
 * @author Philippe Bolduc <philippe@ansregistry.org>
 * @license MIT
 */

export {
    resolve,
    resolveBatch,
    resolveCached,
    health,
    validateAgentURI,
    parseAgentURI,
    configureInternalAgents,
    registerInternalAgent,
    DEMO_REGISTRY
  } from './resolve';
  
  export type {
    AgentRecord,
    ResolutionError,
    AgentMetadata,
    ResolutionInfo,
    InternalAgentConfig
  } from './types';
  
  // Version info
  export const VERSION = '0.1.0';
  export const REGISTRY_AUTHORITY = 'ansregistry.org';
  
  // Default configuration
  export const DEFAULT_CONFIG = {
    timeout: 5000,
    cache_ttl: 300,
    max_retries: 3,
    fallback_enabled: true
  };