# 🤖 ANS Registry Core

[![npm version](https://badge.fury.io/js/@ansregistry%2Fcore.svg)](https://badge.fury.io/js/@ansregistry%2Fcore)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Tests](https://github.com/ANSRegistry/core/actions/workflows/test.yml/badge.svg)](https://github.com/ANSRegistry/core/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Universal naming for AI agents.** Resolve `agent://` URIs to service endpoints, like DNS for the web.

```typescript
import { resolve } from '@ansregistry/core';

const agent = await resolve('agent://support.stripe.com');
console.log(agent.endpoint);
// → "https://api.stripe.com/agents/support"
```

## 🚀 Quick Start

```bash
npm install @ansregistry/core
```

```typescript
import { resolve, validateAgentURI } from '@ansregistry/core';

// Resolve any agent:// URI
const agent = await resolve('agent://hello.dev.ansregistry');
if ('endpoint' in agent) {
  console.log(`Found agent at: ${agent.endpoint}`);
  console.log(`Capabilities: ${agent.capabilities?.join(', ')}`);
} else {
  console.error(`Resolution failed: ${agent.message}`);
}

// Validate URI format
if (validateAgentURI('agent://my-agent.service.com')) {
  console.log('Valid agent URI format');
}
```

## 🎯 Why ANS Registry?

**Current Problem:**
- AI agents are discovered through hardcoded endpoints
- No standard way to find or connect to agents
- Difficult to manage agent lifecycles and updates

**ANS Solution:**
- **Memorable names**: `agent://support.acme.com` instead of `https://api-v2.acme.internal.systems/ai/agents/customer-support/v1.2.3/endpoint`
- **Hierarchical organization**: `agent://billing.payments.stripe.com`
- **Automatic discovery**: Like DNS, but for AI agents
- **Enterprise support**: Internal agents with `agent://hr.internal.company.local`

## 🏗️ Architecture

```
agent://support.stripe.com
    ↓
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ANS Resolver  │ -> │  Resolution      │ -> │   Agent         │
│                 │    │  Methods         │    │   Endpoint      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌──────────┐ ┌────────┐ ┌────────┐
              │ Registry │ │.well-  │ │  DNS   │
              │   API    │ │known   │ │  TXT   │
              └──────────┘ └────────┘ └────────┘
```

## 🔧 Features

- ✅ **Sub-100ms resolution** - Cached lookups with intelligent TTL
- ✅ **Multiple resolution methods** - Registry API, .well-known, DNS TXT records  
- ✅ **Enterprise support** - Internal agents and custom registries
- ✅ **TypeScript native** - Full type safety and IntelliSense
- ✅ **Framework agnostic** - Works with any JavaScript runtime
- ✅ **Comprehensive testing** - 38 tests covering all scenarios
- ✅ **Zero dependencies** - Lightweight and secure

## 📖 API Reference

### Core Functions

#### `resolve(uri: string): Promise<AgentRecord | ResolutionError>`

Resolves an agent URI to its service endpoint and metadata.

```typescript
const result = await resolve('agent://support.demo.ansregistry');
// Returns AgentRecord with endpoint, capabilities, metadata, etc.
```

#### `resolveBatch(uris: string[]): Promise<(AgentRecord | ResolutionError)[]>`

Resolve multiple agents concurrently.

```typescript
const results = await resolveBatch([
  'agent://support.stripe.com',
  'agent://billing.stripe.com'
]);
```

#### `resolveCached(uri: string): Promise<AgentRecord | ResolutionError>`

Resolve with intelligent caching (respects TTL).

#### `validateAgentURI(uri: string): boolean`

Validate agent URI format.

```typescript
validateAgentURI('agent://hello.world.com'); // true
validateAgentURI('http://hello.world.com');  // false
```

### Configuration

#### `configureInternalAgents(config: InternalAgentConfig): void`

Configure internal/enterprise agents.

```typescript
configureInternalAgents({
  useInternalAgents: true,
  internalRegistry: {
    'agent://hr.internal.company.local': {
      endpoint: 'https://hr-system.company.local/agent',
      status: 'active',
      capabilities: ['hr', 'benefits', 'payroll']
    }
  }
});
```

#### `registerInternalAgent(uri: string, agent: Partial<AgentRecord>): void`

Register an internal agent at runtime.

```typescript
registerInternalAgent('agent://custom.internal.local', {
  endpoint: 'https://custom.local/agent',
  capabilities: ['custom-feature'],
  metadata: {
    description: 'Custom internal agent',
    version: '1.0.0'
  }
});
```

## 🌐 Resolution Methods

ANS Registry attempts resolution in this order:

### 1. **Demo Registry** (for development)
Built-in agents for testing and examples:
- `agent://hello.dev.pbolduc`
- `agent://support.demo.ansregistry` 
- `agent://test.local`

### 2. **Internal Agents** (enterprise)
Configured internal agents for organizations:
- `agent://hr.internal.company.local`
- `agent://it-support.internal.company.local`

### 3. **.well-known Discovery** (public)
Automatic discovery via `https://domain.com/.well-known/agent.json`:

```json
{
  "owner": "stripe.com",
  "agents": [
    {
      "agent_uri": "agent://support.stripe.com",
      "endpoint": "https://api.stripe.com/agents/support",
      "capabilities": ["billing", "support", "payments"],
      "version": "1.0.0"
    }
  ]
}
```

### 4. **DNS TXT Records** (future)
DNS-based discovery for maximum compatibility.

## 🏢 Enterprise Setup

For internal company agents:

```typescript
import { configureInternalAgents, resolve } from '@ansregistry/core';

// Configure your internal agents
configureInternalAgents({
  useInternalAgents: true,
  internalWellKnownSources: [
    'https://internal.company.com/.well-known/agents.json'
  ],
  internalRegistry: {
    'agent://hr.internal.company.local': {
      endpoint: 'https://hr.company.local/agent',
      status: 'active',
      capabilities: ['benefits', 'payroll', 'policies']
    }
  }
});

// Now resolve internal agents
const hrAgent = await resolve('agent://hr.internal.company.local');
```

## 🎮 Try the Demo

Visit our [live demo](https://ansregistry.org/demo) or run locally:

```bash
git clone https://github.com/ANSRegistry/core.git
cd core
npm install
npm run demo
```

## 🧪 Examples

### React Integration

```typescript
import { resolve } from '@ansregistry/core';
import { useState, useEffect } from 'react';

function AgentResolver({ agentUri }: { agentUri: string }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolve(agentUri).then(result => {
      setAgent(result);
      setLoading(false);
    });
  }, [agentUri]);

  if (loading) return <div>Resolving agent...</div>;
  if ('error' in agent) return <div>Error: {agent.message}</div>;
  
  return (
    <div>
      <h3>Agent: {agent.agent_uri}</h3>
      <p>Endpoint: {agent.endpoint}</p>
      <p>Capabilities: {agent.capabilities?.join(', ')}</p>
    </div>
  );
}
```

### Node.js API Server

```typescript
import express from 'express';
import { resolve } from '@ansregistry/core';

const app = express();

app.get('/resolve/:agentUri', async (req, res) => {
  try {
    const result = await resolve(req.params.agentUri);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## 📊 Performance

- **Resolution time**: < 100ms for cached agents
- **Concurrent resolution**: Handles 10+ agents simultaneously  
- **Memory usage**: < 1MB for resolver + cache
- **Bundle size**: < 50KB minified

## 🧪 Development

```bash
# Clone and install
git clone https://github.com/ANSRegistry/core.git
cd core
npm install

# Development workflow
npm run test:watch    # Run tests in watch mode
npm run build:watch   # Compile TypeScript in watch mode  
npm run demo          # Start demo server

# Before committing
npm run lint          # Check code style
npm run typecheck     # Verify TypeScript  
npm test              # Run all tests
```

## 🛣️ Roadmap

- [x] **Core resolver** - TypeScript resolver with caching
- [x] **Demo agents** - Built-in agents for development  
- [x] **Internal agents** - Enterprise/private agent support
- [ ] **Registry server** - Centralized agent registry API
- [ ] **CLI tools** - Command-line agent management
- [ ] **Browser extension** - Agent discovery in web browsers
- [ ] **Monitoring** - Agent health and analytics dashboard

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Quick Start
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`  
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋 Support & Community

- **Documentation**: [ansregistry.org/docs](https://ansregistry.org/docs)
- **Issues**: [GitHub Issues](https://github.com/ANSRegistry/core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ANSRegistry/core/discussions)  
- **Email**: [philippe@ansregistry.org](mailto:philippe@ansregistry.org)
- **Twitter**: [@ansregistry](https://twitter.com/ansregistry)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ANSRegistry/core&type=Date)](https://star-history.com/#ANSRegistry/core&Date)

---

**Made with ❤️ by [Philippe Bolduc](https://github.com/pbolduc) and the ANS Registry community**



**Voici le package.json racine complet pour build et servir !** 🎯## **🚀 Commandes principales à utiliser**

### **🔧 Build automatique + interface**
```bash
npm run dev
# → Build core + serve interface sur localhost:3000
# → Aller à: http://localhost:3000/admin-ui/
```

### **🔥 Développement avec watch mode**
```bash
npm run dev:full
# → Build core en watch + serve interface
# → Rebuild automatique sur changements
```

### **⚡ Interface rapide (si core déjà buildé)**
```bash
npm run admin:quick
# → Serve seulement (pas de rebuild)
```

### **🧪 Build + test**
```bash
npm run build
npm run test
```

## **💡 Scripts utiles**

### **Build seulement le core**
```bash
npm run build:core
```

### **Watch mode pour développement**
```bash
npm run build:watch
# → Rebuild automatique sur changements TypeScript
```

### **Démarrage simple**
```bash
npm start
# → Équivalent à npm run admin
```

## **📋 Installation des dépendances**

```bash
# Installer toutes les dépendances
npm install

# Si vous voulez installer explicitement dans workspaces
npm run install:all
```

## **🎯 Workflow quotidien recommandé**

### **1. Développement actif**
```bash
npm run dev:full
# → Terminal unique avec build automatique + serveur
```

### **2. Test rapide**
```bash
npm run admin:quick
# → Interface immédiate si pas de changements code
```

### **3. Build production**
```bash
npm run build
npm run test
# → Build propre + validation
```

## **🔧 Scripts de maintenance**

```bash
# Clean builds
npm run clean

# Linting
npm run lint:fix

# Formatting
npm run format

# Type checking sans build
npm run typecheck
```

## **✅ Utilisation immédiate**

```bash
# 1. Créer ce package.json à la racine
# 2. Installer dépendances
npm install

# 3. Démarrer développement
npm run dev
# → Build core + interface sur localhost:3000

# 4. Ouvrir navigateur
# → http://localhost:3000/admin-ui/
```

**Ce package.json vous donne tous les outils pour développer efficacement !** 🏆

**Voulez-vous l'installer maintenant ?**