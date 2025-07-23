import * as fs from 'fs';
import type { StorageAgentRecord, RegistryConfig } from './types';

export class SimpleStorage {
  private configPath = 'data/registry-config.json';
  private agentsPath = 'data/internal-agents.json';

  constructor() {
    // Créer le dossier data s'il n'existe pas
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data', { recursive: true });
    }
  }

  // Configuration Management
  loadConfig(): RegistryConfig {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch {
      const defaultConfig: RegistryConfig = {
        version: '0.1.0',
        settings: {
          default_ttl: 300000, // 5 minutes
          max_cache_size: 1000,
          enable_health_checks: true,
          log_level: 'info'
        },
        well_known_sources: [
          'https://internal.company.com/.well-known/agents.json'
        ],
        dns_servers: ['8.8.8.8', '1.1.1.1'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  saveConfig(config: RegistryConfig): void {
    config.updated_at = new Date().toISOString();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  updateConfig(updates: Partial<RegistryConfig>): RegistryConfig {
    const config = this.loadConfig();
    const updated = { ...config, ...updates };
    this.saveConfig(updated);
    return updated;
  }

  // Agent Management
  loadAgents(): Record<string, StorageAgentRecord> {
    try {
      const data = fs.readFileSync(this.agentsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  saveAgents(agents: Record<string, StorageAgentRecord>): void {
    fs.writeFileSync(this.agentsPath, JSON.stringify(agents, null, 2));
  }

  addAgent(uri: string, data: Omit<StorageAgentRecord, 'agent_uri' | 'metadata'> & { metadata?: Partial<StorageAgentRecord['metadata']> }): void {
    const agents = this.loadAgents();
    const now = new Date().toISOString();
    
    agents[uri] = {
      ...data,
      agent_uri: uri,
      metadata: {
        created_at: data.metadata?.created_at || now,
        updated_at: now,
        description: data.metadata?.description,
        owner: data.metadata?.owner,
        tags: data.metadata?.tags,
        discovery_level: data.metadata?.discovery_level
      }
    };
    
    this.saveAgents(agents);
  }

  getAgent(uri: string): StorageAgentRecord | undefined {
    const agents = this.loadAgents();
    return agents[uri];
  }

  updateAgent(uri: string, updates: Partial<StorageAgentRecord>): boolean {
    const agents = this.loadAgents();
    if (!agents[uri]) return false;

    agents[uri] = {
      ...agents[uri],
      ...updates,
      metadata: {
        ...agents[uri].metadata,
        created_at: agents[uri].metadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: updates.metadata?.description ?? agents[uri].metadata?.description,
        owner: updates.metadata?.owner ?? agents[uri].metadata?.owner,
        tags: updates.metadata?.tags ?? agents[uri].metadata?.tags,
        discovery_level: updates.metadata?.discovery_level ?? agents[uri].metadata?.discovery_level
      }
    };
    
    this.saveAgents(agents);
    return true;
  }

  removeAgent(uri: string): boolean {
    const agents = this.loadAgents();
    if (!agents[uri]) return false;
    
    delete agents[uri];
    this.saveAgents(agents);
    return true;
  }

  listAgents(filter?: { status?: string; capability?: string }): StorageAgentRecord[] {
    const agents = this.loadAgents();
    let results = Object.values(agents);
    
    if (filter?.status) {
      results = results.filter(agent => agent.status === filter.status);
    }
    
    if (filter?.capability) {
      results = results.filter(agent => 
        agent.capabilities?.includes(filter.capability!)
      );
    }
    
    return results;
  }

  searchAgents(query: string): StorageAgentRecord[] {
    const agents = this.loadAgents();
    const searchTerm = query.toLowerCase();
    
    return Object.values(agents).filter(agent => 
      agent.agent_uri.toLowerCase().includes(searchTerm) ||
      agent.endpoint.toLowerCase().includes(searchTerm) ||
      agent.capabilities?.some(cap => cap.toLowerCase().includes(searchTerm)) ||
      agent.metadata?.description?.toLowerCase().includes(searchTerm)
    );
  }

  // Utility methods
  exportData(): { config: RegistryConfig; agents: Record<string, StorageAgentRecord> } {
    return {
      config: this.loadConfig(),
      agents: this.loadAgents()
    };
  }

  importData(data: { config?: RegistryConfig; agents?: Record<string, StorageAgentRecord> }): void {
    if (data.config) {
      this.saveConfig(data.config);
    }
    if (data.agents) {
      this.saveAgents(data.agents);
    }
  }
}