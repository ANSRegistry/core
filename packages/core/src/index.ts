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
  DEMO_REGISTRY
} from './resolve.js';  // ← AJOUTER .js

// Type definitions
export type {
  AgentRecord,
  ResolutionError,
  InternalAgentConfig
} from './types.js';  // ← AJOUTER .js

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