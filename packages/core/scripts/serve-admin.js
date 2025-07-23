import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function serveAdmin() {
  try {
    // Import our ES modules (using actual exports)
    const { resolve } = await import('../dist/resolve.js');
    const { SimpleStorage } = await import('../dist/storage.js');
    const { discoverAgents, searchAgents, findAgentsByCapabilities, getHealthyAgents } = await import('../dist/discovery.js');
    const { checkAgentHealth, checkMultipleAgentsHealth, getHealthStats } = await import('../dist/health.js');

    const app = express();
    const port = process.env.PORT || 3000;
    const storage = new SimpleStorage();

    app.use(cors());
    app.use(express.json());

    // Existing API Routes
    app.get('/api/agents', (req, res) => {
      try {
        res.json(storage.listAgents());
      } catch (error) {
        console.error('Error loading agents:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/agents', (req, res) => {
      try {
        const { agent_uri, endpoint, capabilities, status, metadata } = req.body;
        
        if (storage.getAgent(agent_uri)) {
          return res.status(400).json({ error: 'Agent already exists' });
        }

        storage.addAgent(agent_uri, {
          endpoint,
          status: status || 'active',
          capabilities: capabilities || [],
          version: '1.0.0',
          metadata: metadata || {}
        });

        res.json({ success: true });
      } catch (error) {
        console.error('Error adding agent:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/agents/:uri', (req, res) => {
      try {
        const uri = decodeURIComponent(req.params.uri);
        const { agent_uri, endpoint, capabilities, status, metadata } = req.body;
        
        if (!storage.getAgent(uri)) {
          return res.status(404).json({ error: 'Agent not found' });
        }

        // Update the agent
        storage.addAgent(agent_uri, {
          endpoint,
          status: status || 'active',
          capabilities: capabilities || [],
          version: '1.0.0',
          metadata: metadata || {}
        });

        // If URI changed, remove old one
        if (uri !== agent_uri) {
          storage.removeAgent(uri);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error updating agent:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/agents/:uri', (req, res) => {
      try {
        const uri = decodeURIComponent(req.params.uri);
        const success = storage.removeAgent(uri);
        res.json({ success });
      } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/resolve/:uri', async (req, res) => {
      try {
        const uri = decodeURIComponent(req.params.uri);
        const result = await resolve(uri);  // ✅ Direct function call
        res.json(result);
      } catch (error) {
        console.error('Error resolving agent:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/config', (req, res) => {
      try {
        res.json(storage.loadConfig());
      } catch (error) {
        console.error('Error loading config:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // NEW: Agent Discovery API Routes
    app.post('/api/discover', async (req, res) => {
      try {
        const query = req.body;
        const result = await discoverAgents(query);
        res.json(result);
      } catch (error) {
        console.error('Error in agent discovery:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/discover', async (req, res) => {
      try {
        const query = {
          capabilities: req.query.capabilities ? req.query.capabilities.split(',') : undefined,
          organization: req.query.organization,
          status: req.query.status ? req.query.status.split(',') : undefined,
          discovery_level: req.query.discovery_level ? req.query.discovery_level.split(',') : undefined,
          include_local: req.query.include_local !== 'false',
          include_wellknown: req.query.include_wellknown === 'true',
          include_global: req.query.include_global === 'true',
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          search: req.query.search,
          min_health_score: req.query.min_health_score ? parseInt(req.query.min_health_score) : undefined
        };
        
        const result = await discoverAgents(query);
        res.json(result);
      } catch (error) {
        console.error('Error in agent discovery:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/search/:query', async (req, res) => {
      try {
        const searchText = decodeURIComponent(req.params.query);
        const options = {
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          include_wellknown: req.query.include_wellknown === 'true'
        };
        
        const result = await searchAgents(searchText, options);
        res.json(result);
      } catch (error) {
        console.error('Error in agent search:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/capabilities/:capabilities', async (req, res) => {
      try {
        const capabilities = decodeURIComponent(req.params.capabilities).split(',');
        const options = {
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          include_wellknown: req.query.include_wellknown === 'true'
        };
        
        const result = await findAgentsByCapabilities(capabilities, options);
        res.json(result);
      } catch (error) {
        console.error('Error in capabilities search:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/healthy', async (req, res) => {
      try {
        const options = {
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          min_health_score: req.query.min_health_score ? parseInt(req.query.min_health_score) : 80
        };
        
        const result = await getHealthyAgents(options);
        res.json(result);
      } catch (error) {
        console.error('Error getting healthy agents:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // NEW: Health Monitoring API Routes
    app.post('/api/health/check', async (req, res) => {
      try {
        const { agents } = req.body;
        if (!Array.isArray(agents)) {
          return res.status(400).json({ error: 'agents array required' });
        }
        
        const results = await checkMultipleAgentsHealth(agents);
        res.json(results);
      } catch (error) {
        console.error('Error in health check:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/health/check/:uri', async (req, res) => {
      try {
        const uri = decodeURIComponent(req.params.uri);
        const agent = storage.getAgent(uri);
        
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        // Convert storage agent to resolver agent format
        const agentRecord = {
          agent_uri: agent.agent_uri,
          endpoint: agent.endpoint,
          status: agent.status === 'maintenance' ? 'suspended' : agent.status,
          capabilities: agent.capabilities || []
        };
        
        const health = await checkAgentHealth(agentRecord);
        res.json(health);
      } catch (error) {
        console.error('Error in health check:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/health/stats', async (req, res) => {
      try {
        const stats = getHealthStats();
        res.json(stats);
      } catch (error) {
        console.error('Error getting health stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Serve admin UI from root
    app.get('/', (req, res) => {
      const rootAdminUIPath = join(__dirname, '../../../admin-ui/index.html');
      const localAdminUIPath = join(__dirname, '../../admin-ui/index.html');
      
      if (existsSync(rootAdminUIPath)) {
        res.sendFile(rootAdminUIPath);
      } else if (existsSync(localAdminUIPath)) {
        res.sendFile(localAdminUIPath);
      } else {
        res.send(`
          <h1>🤖 ANS Registry Admin</h1>
          <p>❌ admin-ui/index.html not found</p>
          <p>📋 API endpoints working:</p>
          <ul>
            <li><a href="/api/agents">/api/agents</a> - ${storage.listAgents().length} agents</li>
            <li><a href="/api/config">/api/config</a></li>
            <li><a href="/api/resolve/agent%3A%2F%2Fhello.dev.pbolduc">Test resolve demo agent</a></li>
            <li><a href="/api/discover?include_local=true">🔍 Agent Discovery</a></li>
            <li><a href="/api/search/support">🔍 Search agents</a></li>
            <li><a href="/api/healthy">💚 Healthy agents</a></li>
            <li><a href="/api/health/stats">📊 Health stats</a></li>
          </ul>
          <p>💡 Create <code>admin-ui/index.html</code> at project root</p>
          <p>📁 Data saved to: <code>data/</code> folder at project root</p>
        `);
      }
    });

    // Serve static files
    const rootAdminUIDir = join(__dirname, '../../../admin-ui');
    const localAdminUIDir = join(__dirname, '../../admin-ui');
    
    if (existsSync(rootAdminUIDir)) {
      app.use('/admin-ui', express.static(rootAdminUIDir));
    }
    if (existsSync(localAdminUIDir)) {
      app.use('/admin-ui', express.static(localAdminUIDir));
    }

    app.listen(port, () => {
      console.log(`🚀 ANS Registry Admin: http://localhost:3000`);
      console.log(`📁 Data stored in: data/ (project root)`);
      console.log(`📋 API working - ${storage.listAgents().length} agents loaded`);
      console.log(`🔍 Discovery API enabled with health monitoring`);
      console.log('');
      console.log('🌐 Open: http://localhost:3000');
      console.log('');
      console.log('🔗 Discovery endpoints:');
      console.log('  GET  /api/discover?capabilities=support,billing');
      console.log('  POST /api/discover (with query body)');
      console.log('  GET  /api/search/support');
      console.log('  GET  /api/healthy');
      console.log('  GET  /api/health/stats');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('💡 Make sure dist/ files exist. Run: npm run build:core');
    }
    process.exit(1);
  }
}

serveAdmin().catch(console.error);