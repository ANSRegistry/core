# ANS Core - Agent Name System

**Universal naming for AI agents.** Resolve `agent://` URIs to service endpoints.

🚀 **Demo coming soon** | 🌐 **[Get Early Access](https://ansregistry.org)**

## Quick Example

```javascript
import { resolve } from '@ansregistry/core';

const agent = await resolve('agent://support.stripe.com');
console.log(agent.endpoint); 
// → "https://api.stripe.com/agents/support"
```

## What is ANS?

**DNS-like naming for AI agents.** Discover and connect to agents using memorable, hierarchical names.

```
agent://support.acme.com
agent://billing.payments.stripe.com
agent://copilot.microsoft.com
```

## Status

**⚠️ Early Development - Get Early Access**

Core resolver in development. Be first to reserve your agent:// name.

**[Request Early Access →](https://ansregistry.org)**

## Installation

```bash
# Coming soon
npm install @ansregistry/core
```

## Quick Start

```javascript
import { resolve } from '@ansregistry/core';

// Resolve any agent:// URI (coming soon)
const agent = await resolve('agent://support.stripe.com');
console.log(agent.endpoint);
```

## Roadmap

- ✅ Core resolver 
- 🚧 Global registry
- 🚧 Enterprise features
- 🚧 Platform integrations

## Contact

- **Creator**: Philippe Bolduc
- **Email**: philippe@ansregistry.org
- **Registry**: [ansregistry.org](https://ansregistry.org)  
- **Issues**: [GitHub Issues](https://github.com/ansregistry/core/issues)

## License

MIT License

---

⭐ **Star this repo** to follow ANS development!
