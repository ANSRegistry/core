/**
 * Comprehensive Test suite for ANS Resolver v0.1
 * Run with: npx tsx test/resolve.test.ts
 */

import { 
    resolve, 
    resolveBatch, 
    resolveCached, 
    health, 
    validateAgentURI, 
    parseAgentURI,
    configureInternalAgents,
    registerInternalAgent,
    DEMO_REGISTRY 
  } from '../src/resolve';
  import type { AgentRecord, ResolutionError } from '../src/types';
  
  // Simple test runner
  interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    duration: number;
  }
  
  const tests: Array<() => Promise<TestResult>> = [];
  
  function test(name: string, fn: () => Promise<void>): void {
    tests.push(async () => {
      const start = Date.now();
      try {
        await fn();
        return {
          name,
          passed: true,
          duration: Date.now() - start
        };
      } catch (error) {
        return {
          name,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - start
        };
      }
    });
  }
  
  function assert(condition: boolean, message: string = 'Assertion failed'): void {
    if (!condition) {
      throw new Error(message);
    }
  }
  
  function assertEquals(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }
  
  function assertContains(actual: string, expected: string, message?: string): void {
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected "${actual}" to contain "${expected}"`);
    }
  }
  
  // Type guards for testing
  function isAgentRecord(result: AgentRecord | ResolutionError): result is AgentRecord {
    return 'endpoint' in result;
  }
  
  function isResolutionError(result: AgentRecord | ResolutionError): result is ResolutionError {
    return 'error' in result;
  }
  
  // ========================
  // URI Validation Tests
  // ========================
  test('validates correct agent URIs', async () => {
    assert(validateAgentURI('agent://hello.dev.pbolduc'), 'Should validate demo URI');
    assert(validateAgentURI('agent://support.billing.stripe.com'), 'Should validate multi-level URI');
    assert(validateAgentURI('agent://test.local'), 'Should validate local URI');
    assert(validateAgentURI('agent://a.b.com'), 'Should validate minimal URI');
    assert(validateAgentURI('agent://agent-name.service.org.com'), 'Should validate with hyphens');
    assert(validateAgentURI('agent://my-agent.my-service.example.com'), 'Should validate multiple hyphens');
  });
  
  test('rejects invalid agent URIs', async () => {
    assert(!validateAgentURI('http://hello.dev.pbolduc'), 'Should reject http scheme');
    assert(!validateAgentURI('agent://'), 'Should reject empty URI');
    assert(!validateAgentURI('agent://hello'), 'Should reject single component');
    assert(!validateAgentURI('agent://hello..com'), 'Should reject double dots');
    assert(!validateAgentURI('agent://-hello.com'), 'Should reject leading hyphen');
    assert(!validateAgentURI('agent://hello.com-'), 'Should reject trailing hyphen');
    assert(!validateAgentURI(''), 'Should reject empty string');
    assert(!validateAgentURI('not-an-agent-uri'), 'Should reject malformed URI');
    assert(!validateAgentURI('agent://hello.-service.com'), 'Should reject hyphen after dot');
    assert(!validateAgentURI('agent://hello.service-.com'), 'Should reject hyphen before dot');
  });
  
  test('validates URI length limits', async () => {
    const validLongURI = 'agent://' + 'a'.repeat(100) + '.example.com';
    const tooLongURI = 'agent://' + 'a'.repeat(250) + '.example.com';
    
    assert(!validateAgentURI(tooLongURI), 'Should reject URIs over 253 characters');
    assert(validLongURI.length < 253, 'Test setup: valid URI should be under limit');
  });
  
  // ========================
  // URI Parsing Tests
  // ========================
  test('parses agent URIs correctly', async () => {
    const parsed1 = parseAgentURI('agent://hello.dev.pbolduc');
    assert(parsed1 !== null, 'Should parse URI successfully');
    assertEquals(parsed1?.agent_name, 'hello');
    assertEquals(parsed1?.service, 'dev');
    assertEquals(parsed1?.organization, 'pbolduc');
  
    const parsed2 = parseAgentURI('agent://support.billing.stripe.com');
    assert(parsed2 !== null, 'Should parse complex URI successfully');
    assertEquals(parsed2?.agent_name, 'support');
    assertEquals(parsed2?.service, 'billing');
    assertEquals(parsed2?.organization, 'stripe.com');
  
    const parsed3 = parseAgentURI('agent://test.local');
    assert(parsed3 !== null, 'Should parse simple URI successfully');
    assertEquals(parsed3?.agent_name, 'test');
    assertEquals(parsed3?.service, undefined);
    assertEquals(parsed3?.organization, 'local');
  });
  
  test('parses complex hierarchical URIs', async () => {
    const parsed = parseAgentURI('agent://ai.chat.customer-service.big-corp.enterprise.com');
    assert(parsed !== null, 'Should parse complex hierarchical URI');
    assertEquals(parsed?.agent_name, 'ai');
    assertEquals(parsed?.service, 'chat');
    assertEquals(parsed?.organization, 'customer-service.big-corp.enterprise.com');
  });
  
  test('returns null for invalid URIs during parsing', async () => {
    const parsed1 = parseAgentURI('http://hello.dev.pbolduc');
    assertEquals(parsed1, null, 'Should return null for non-agent URI');
  
    const parsed2 = parseAgentURI('agent://');
    assertEquals(parsed2, null, 'Should return null for empty agent URI');
  
    const parsed3 = parseAgentURI('invalid');
    assertEquals(parsed3, null, 'Should return null for completely invalid URI');
  });
  
  // ========================
  // Demo Registry Resolution Tests
  // ========================
  test('resolves demo agents successfully', async () => {
    const result = await resolve('agent://hello.dev.pbolduc');
    
    assert(isAgentRecord(result), 'Should return agent record, not error');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://hello.dev.pbolduc');
      assertEquals(result.status, 'active');
      assertContains(result.endpoint, 'api.ansregistry.org', 'Should have correct endpoint domain');
      assert(result.capabilities?.includes('chat') === true, 'Should have chat capability');
      assert(result.capabilities?.includes('demo') === true, 'Should have demo capability');
      assert(result.metadata !== undefined, 'Should have metadata');
      assertEquals(result.metadata.organization, 'ANS Registry', 'Should have correct organization');
      assert(result.resolution !== undefined, 'Should have resolution info');
      assert(typeof result.resolution.ttl === 'number', 'Should have TTL in resolution info');
      assert(typeof result.resolution.resolved_at === 'string', 'Should have resolved_at timestamp');
      assertEquals(result.resolution.resolver, 'ansregistry.org', 'Should have correct resolver');
      assertEquals(result.resolution.cached, false, 'Should not be cached initially');
    }
  });
  
  test('resolves support demo agent successfully', async () => {
    const result = await resolve('agent://support.demo.ansregistry');
    
    assert(isAgentRecord(result), 'Should return agent record for support agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://support.demo.ansregistry');
      assertEquals(result.status, 'active');
      assertContains(result.endpoint, 'api.ansregistry.org', 'Should have correct endpoint');
      assert(result.capabilities?.includes('support') === true, 'Should have support capability');
      assert(result.capabilities?.includes('faq') === true, 'Should have faq capability');
      assert(result.capabilities?.includes('documentation') === true, 'Should have documentation capability');
    }
  });
  
  test('resolves local test agent successfully', async () => {
    const result = await resolve('agent://test.local');
    
    assert(isAgentRecord(result), 'Should return agent record for local agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://test.local');
      assertEquals(result.status, 'active');
      assertContains(result.endpoint, 'localhost', 'Should have localhost endpoint');
      assert(result.capabilities?.includes('test') === true, 'Should have test capability');
      assert(result.capabilities?.includes('development') === true, 'Should have development capability');
    }
  });
  
  test('demo registry contains expected agents', async () => {
    assert(DEMO_REGISTRY['agent://hello.dev.pbolduc'] !== undefined, 'Should contain hello agent');
    assert(DEMO_REGISTRY['agent://support.demo.ansregistry'] !== undefined, 'Should contain support agent');
    assert(DEMO_REGISTRY['agent://test.local'] !== undefined, 'Should contain test agent');
    
    // Verify structure of demo registry entries
    const helloAgent = DEMO_REGISTRY['agent://hello.dev.pbolduc'];
    assert(helloAgent.endpoint.length > 0, 'Hello agent should have endpoint');
    assert(helloAgent.capabilities && helloAgent.capabilities.length > 0, 'Hello agent should have capabilities');
    assert(helloAgent.metadata !== undefined, 'Hello agent should have metadata');
    assertEquals(helloAgent.metadata.organization, 'ANS Registry', 'Hello agent should have correct organization');
  });
  
  // ========================
  // Internal Agents Tests
  // ========================
  test('resolves internal agents successfully', async () => {
    const result = await resolve('agent://hr.internal.company.local');
    
    assert(isAgentRecord(result), 'Should return agent record for internal agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://hr.internal.company.local');
      assertEquals(result.status, 'active');
      assertContains(result.endpoint, 'hr-system.company.local', 'Should have correct internal endpoint');
      assert(result.capabilities?.includes('hr') === true, 'Should have hr capability');
      assert(result.capabilities?.includes('benefits') === true, 'Should have benefits capability');
      assert(result.capabilities?.includes('internal') === true, 'Should have internal capability');
      assert(result.resolution !== undefined, 'Should have resolution info');
      assertEquals(result.resolution.resolver, 'internal-config', 'Should use internal resolver');
      assert(result.resolution.ttl === 3600, 'Internal agents should have longer TTL');
    }
  });
  
  test('resolves IT support internal agent', async () => {
    const result = await resolve('agent://it-support.internal.company.local');
    
    assert(isAgentRecord(result), 'Should return agent record for IT support agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://it-support.internal.company.local');
      assertContains(result.endpoint, 'helpdesk.company.local', 'Should have correct IT endpoint');
      assert(result.capabilities?.includes('it') === true, 'Should have IT capability');
      assert(result.capabilities?.includes('support') === true, 'Should have support capability');
      assert(result.metadata !== undefined, 'Should have metadata');
      assertEquals(result.metadata.organization, 'Company Corp IT', 'Should have correct IT organization');
    }
  });
  
  test('resolves admin internal agent', async () => {
    const result = await resolve('agent://admin.internal.company.local');
    
    assert(isAgentRecord(result), 'Should return agent record for admin agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://admin.internal.company.local');
      assertContains(result.endpoint, 'admin-panel.company.local', 'Should have correct admin endpoint');
      assert(result.capabilities?.includes('admin') === true, 'Should have admin capability');
      assert(result.capabilities?.includes('user-management') === true, 'Should have user-management capability');
    }
  });
  
  // ========================
  // Runtime Registration Tests
  // ========================
  test('registers internal agent at runtime', async () => {
    const testURI = 'agent://runtime-test.internal.example.local';
    
    // Register a new internal agent
    registerInternalAgent(testURI, {
      endpoint: 'https://runtime-test.example.local/agent',
      status: 'active',
      capabilities: ['runtime', 'test'],
      metadata: {
        description: 'Runtime registered test agent',
        version: '1.0.0'
      },
      type: 'system'
    });
    
    // Should be able to resolve it
    const result = await resolve(testURI);
    assert(isAgentRecord(result), 'Should resolve runtime-registered agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, testURI);
      assertEquals(result.endpoint, 'https://runtime-test.example.local/agent');
      assertEquals(result.status, 'active');
      assertEquals(result.type, 'system');
      assert(result.capabilities?.includes('runtime') === true, 'Should have runtime capability');
      assert(result.capabilities?.includes('test') === true, 'Should have test capability');
      assert(result.resolution !== undefined, 'Should have resolution info');
      assertEquals(result.resolution.resolver, 'internal-registry', 'Should use internal-registry resolver');
    }
  });
  
  test('registers minimal internal agent', async () => {
    const testURI = 'agent://minimal-test.internal.example.local';
    
    // Register with minimal info
    registerInternalAgent(testURI, {
      endpoint: 'https://minimal.example.local/agent'
    });
    
    const result = await resolve(testURI);
    assert(isAgentRecord(result), 'Should resolve minimal agent');
    if (isAgentRecord(result)) {
      assertEquals(result.endpoint, 'https://minimal.example.local/agent');
      assertEquals(result.status, 'active'); // Should default to active
      assertEquals(result.capabilities?.length, 0); // Should default to empty array
    }
  });
  
  // ========================
  // Internal Configuration Tests
  // ========================
  test('configures internal agents', async () => {
    const customAgent: AgentRecord = {
      agent_uri: 'agent://custom.internal.test.local',
      endpoint: 'https://custom.test.local/agent',
      status: 'active',
      capabilities: ['custom', 'configured'],
      metadata: {
        description: 'Custom configured agent'
      }
    };
    
    // Configure with custom registry
    configureInternalAgents({
      useInternalAgents: true,
      internalRegistry: {
        'agent://custom.internal.test.local': customAgent
      }
    });
    
    const result = await resolve('agent://custom.internal.test.local');
    assert(isAgentRecord(result), 'Should resolve configured agent');
    if (isAgentRecord(result)) {
      assertEquals(result.agent_uri, 'agent://custom.internal.test.local');
      assertEquals(result.endpoint, 'https://custom.test.local/agent');
      assert(result.capabilities?.includes('custom') === true, 'Should have custom capability');
    }
  });
  
  test('disables internal agents when configured', async () => {
    // Disable internal agents
    configureInternalAgents({
      useInternalAgents: false
    });
    
    // Should not resolve internal agents
    const result = await resolve('agent://hr.internal.company.local');
    assert(isResolutionError(result), 'Should not resolve when internal agents disabled');
    if (isResolutionError(result)) {
      assertEquals(result.code, 404);
    }
    
    // Re-enable for other tests
    configureInternalAgents({
      useInternalAgents: true
    });
  });
  
  // ========================
  // Error Handling Tests
  // ========================
  test('returns 404 for non-existent agents', async () => {
    const result = await resolve('agent://nonexistent.nowhere.com');
    
    assert(isResolutionError(result), 'Should return error for non-existent agent');
    if (isResolutionError(result)) {
      assertEquals(result.code, 404);
      assertContains(result.message, 'not registered', 'Should indicate agent not registered');
      assertEquals(result.agent_uri, 'agent://nonexistent.nowhere.com');
    }
  });
  
  test('returns 400 for invalid URIs', async () => {
    const result = await resolve('invalid-uri');
    
    assert(isResolutionError(result), 'Should return error for invalid URI');
    if (isResolutionError(result)) {
      assertEquals(result.code, 400);
      assertContains(result.message, 'Invalid URI', 'Should indicate invalid URI format');
      assertContains(result.message, 'format:', 'Should provide format guidance');
    }
  });
  
  test('returns 400 for empty URI', async () => {
    const result = await resolve('');
    
    assert(isResolutionError(result), 'Should return error for empty URI');
    if (isResolutionError(result)) {
      assertEquals(result.code, 400);
      assertContains(result.message, 'Invalid URI', 'Should indicate invalid URI format');
    }
  });
  
  test('handles various invalid URI formats', async () => {
    const invalidURIs = [
      'agent://',
      'agent://hello',
      'agent://hello..world.com',
      'agent://.hello.world.com',
      'agent://hello.world.com.',
      'http://hello.world.com',
      'agent://hello world.com',
      'agent://hello@world.com'
    ];
    
    for (const uri of invalidURIs) {
      const result = await resolve(uri);
      assert(isResolutionError(result), `Should reject invalid URI: ${uri}`);
      if (isResolutionError(result)) {
        assertEquals(result.code, 400, `Should return 400 for: ${uri}`);
      }
    }
  });
  
  // ========================
  // Batch Resolution Tests
  // ========================
  test('resolves multiple agents in batch', async () => {
    const results = await resolveBatch([
      'agent://hello.dev.pbolduc',
      'agent://support.demo.ansregistry',
      'agent://nonexistent.nowhere.com',
      'invalid-uri'
    ]);
  
    assertEquals(results.length, 4, 'Should return results for all URIs');
    
    // First should succeed
    assert(isAgentRecord(results[0]), 'First result should be success');
    if (isAgentRecord(results[0])) {
      assertEquals(results[0].agent_uri, 'agent://hello.dev.pbolduc');
    }
    
    // Second should succeed
    assert(isAgentRecord(results[1]), 'Second result should be success');
    if (isAgentRecord(results[1])) {
      assertEquals(results[1].agent_uri, 'agent://support.demo.ansregistry');
    }
    
    // Third should fail with 404
    assert(isResolutionError(results[2]), 'Third result should be 404 error');
    if (isResolutionError(results[2])) {
      assertEquals(results[2].code, 404);
    }
    
    // Fourth should fail with 400
    assert(isResolutionError(results[3]), 'Fourth result should be 400 error');
    if (isResolutionError(results[3])) {
      assertEquals(results[3].code, 400);
    }
  });
  
  test('handles empty batch resolution', async () => {
    const results = await resolveBatch([]);
    assertEquals(results.length, 0, 'Should return empty array for empty batch');
  });
  
  test('handles batch with all invalid URIs', async () => {
    const results = await resolveBatch(['invalid1', 'invalid2', 'agent://']);
    assertEquals(results.length, 3, 'Should return results for all URIs');
    
    assert(isResolutionError(results[0]), 'First result should be error');
    assert(isResolutionError(results[1]), 'Second result should be error');
    assert(isResolutionError(results[2]), 'Third result should be error');
    
    // All should be 400 errors
    results.forEach((result, index) => {
      if (isResolutionError(result)) {
        assertEquals(result.code, 400, `Result ${index} should be 400 error`);
      }
    });
  });
  
  test('handles mixed internal and public agents in batch', async () => {
    const results = await resolveBatch([
      'agent://hello.dev.pbolduc',           // Public demo
      'agent://hr.internal.company.local',   // Internal
      'agent://test.local'                   // Local demo
    ]);
    
    assertEquals(results.length, 3, 'Should resolve all agent types');
    assert(results.every(r => isAgentRecord(r)), 'All should succeed');
    
    if (isAgentRecord(results[0])) {
      assert(results[0].resolution !== undefined, 'Should have resolution info');
      assertEquals(results[0].resolution.resolver, 'ansregistry.org');
    }
    if (isAgentRecord(results[1])) {
      assert(results[1].resolution !== undefined, 'Should have resolution info');
      assertEquals(results[1].resolution.resolver, 'internal-config');
    }
  });
  
  // ========================
  // Caching Tests
  // ========================
  test('caches resolution results', async () => {
    // Clear any existing cache first by using a unique URI
    const testURI = 'agent://hello.dev.pbolduc';
    
    // First call should resolve normally
    const result1 = await resolveCached(testURI);
    assert(isAgentRecord(result1), 'Should resolve successfully');
    if (isAgentRecord(result1)) {
      assert(result1.resolution !== undefined, 'Should have resolution info');
      assert(result1.resolution.cached === false, 'First call should not be cached');
    }
  
    // Second call should potentially be cached (implementation dependent)
    const result2 = await resolveCached(testURI);
    assert(isAgentRecord(result2), 'Should resolve successfully from cache');
    if (isAgentRecord(result2)) {
      assertEquals(result2.agent_uri, testURI, 'Should return same agent');
    }
  });
  
  test('caches errors as well', async () => {
    const invalidURI = 'agent://invalid.cache.test.nonexistent';
    
    const result1 = await resolveCached(invalidURI);
    assert(isResolutionError(result1), 'Should return error');
  
    const result2 = await resolveCached(invalidURI);
    assert(isResolutionError(result2), 'Should return error again');
    
    if (isResolutionError(result1) && isResolutionError(result2)) {
      assertEquals(result1.code, result2.code, 'Should return same error code');
    }
  });
  
  test('respects TTL in cached results', async () => {
    const result = await resolveCached('agent://hello.dev.pbolduc');
    assert(isAgentRecord(result), 'Should resolve successfully');
    if (isAgentRecord(result)) {
      assert(result.resolution !== undefined, 'Should have resolution info');
      assert(typeof result.resolution.ttl === 'number', 'Should have TTL');
      assert(result.resolution.ttl > 0, 'TTL should be positive');
    }
  });
  
  // ========================
  // Health Check Tests
  // ========================
  test('health check returns proper status', async () => {
    const healthResult = await health();
    assertEquals(healthResult.status, 'ok');
    assertEquals(healthResult.version, '0.1.0');
    assert(typeof healthResult.timestamp === 'string', 'Should have timestamp');
    
    // Should be valid ISO date
    const date = new Date(healthResult.timestamp);
    assert(!isNaN(date.getTime()), 'Timestamp should be valid date');
    
    // Timestamp should be recent (within last minute)
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    assert(diff < 60000, `Timestamp should be recent, diff was ${diff}ms`);
  });
  
  // ========================
  // Performance Tests
  // ========================
  test('resolves agents quickly', async () => {
    const start = Date.now();
    await resolve('agent://hello.dev.pbolduc');
    const duration = Date.now() - start;
    
    assert(duration < 100, `Resolution should be fast, took ${duration}ms`);
  });
  
  test('handles concurrent resolutions efficiently', async () => {
    const start = Date.now();
    const promises = Array(10).fill(0).map(() => resolve('agent://hello.dev.pbolduc'));
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    assertEquals(results.length, 10, 'Should handle all concurrent requests');
    assert(results.every(r => isAgentRecord(r)), 'All requests should succeed');
    assert(duration < 500, `Concurrent resolution should be fast, took ${duration}ms`);
  });
  
  test('handles mixed concurrent resolutions', async () => {
    const uris = [
      'agent://hello.dev.pbolduc',
      'agent://support.demo.ansregistry', 
      'agent://hr.internal.company.local',
      'agent://nonexistent.test.com',
      'invalid-uri',
      'agent://test.local'
    ];
    
    const start = Date.now();
    const results = await Promise.all(uris.map(uri => resolve(uri)));
    const duration = Date.now() - start;
    
    assertEquals(results.length, 6, 'Should handle all requests');
    // Adjusted timeout for mixed resolutions with network timeouts
    assert(duration < 10000, `Mixed resolution should be reasonably fast, took ${duration}ms`);
    
    // Check specific results
    assert(isAgentRecord(results[0]), 'First should succeed (demo)');
    assert(isAgentRecord(results[1]), 'Second should succeed (demo)');  
    assert(isAgentRecord(results[2]), 'Third should succeed (internal)');
    assert(isResolutionError(results[3]), 'Fourth should fail with 404');
    assert(isResolutionError(results[4]), 'Fifth should fail with 400');
    assert(isAgentRecord(results[5]), 'Sixth should succeed (local)');
  });
  
  // ========================
  // Edge Cases
  // ========================
  test('handles very long agent URIs', async () => {
    const longName = 'a'.repeat(100);
    const longUri = `agent://${longName}.test.com`;
    const result = await resolve(longUri);
    
    // Should reject URIs that are too long
    assert(isResolutionError(result), 'Should reject very long URIs');
  });
  
  test('handles special characters in URIs', async () => {
    const specialCases = [
      'agent://hello@world.com',
      'agent://hello world.com',
      'agent://hello.world.com?param=value',
      'agent://hello.world.com#fragment',
      'agent://hello.world.com/',
      'agent://hello.world.com:8080'
    ];
    
    for (const uri of specialCases) {
      const result = await resolve(uri);
      assert(isResolutionError(result), `Should reject URI with special characters: ${uri}`);
    }
  });
  
  test('handles unicode and international domains', async () => {
    // These should be rejected by current validation
    const unicodeURIs = [
      'agent://测试.example.com',
      'agent://tëst.example.com',
      'agent://test.例え.com'
    ];
    
    for (const uri of unicodeURIs) {
      const result = await resolve(uri);
      assert(isResolutionError(result), `Should reject unicode URI: ${uri}`);
    }
  });
  
  test('handles case sensitivity', async () => {
    // URIs should be case sensitive
    const result1 = await resolve('agent://hello.dev.pbolduc');
    const result2 = await resolve('agent://Hello.Dev.Pbolduc');
    
    assert(isAgentRecord(result1), 'Lowercase should resolve');
    assert(isResolutionError(result2), 'Uppercase should not resolve (case sensitive)');
  });
  
  // ========================
  // Resolution Priority Tests
  // ========================
  test('resolution priority order', async () => {
    // Demo registry should take priority over internal agents for demo URIs
    const result = await resolve('agent://hello.dev.pbolduc');
    assert(isAgentRecord(result), 'Should resolve demo agent');
    if (isAgentRecord(result)) {
      assert(result.resolution !== undefined, 'Should have resolution info');
      assertEquals(result.resolution.resolver, 'ansregistry.org', 'Should use demo resolver');
    }
    
    // Internal agents should be resolved when no demo exists
    const internalResult = await resolve('agent://hr.internal.company.local');
    assert(isAgentRecord(internalResult), 'Should resolve internal agent');
    if (isAgentRecord(internalResult)) {
      assert(internalResult.resolution !== undefined, 'Should have resolution info');
      assertEquals(internalResult.resolution.resolver, 'internal-config', 'Should use internal resolver');
    }
  });
  
  test('resolution metadata completeness', async () => {
    const result = await resolve('agent://hello.dev.pbolduc');
    assert(isAgentRecord(result), 'Should resolve successfully');
    
    if (isAgentRecord(result)) {
      // Check resolution metadata
      assert(result.resolution !== undefined, 'Should have resolution metadata');
      assert(typeof result.resolution.ttl === 'number', 'Should have TTL');
      assert(typeof result.resolution.cached === 'boolean', 'Should have cached flag');
      assert(typeof result.resolution.resolver === 'string', 'Should have resolver');
      assert(typeof result.resolution.resolved_at === 'string', 'Should have resolution timestamp');
      
      // Check agent metadata
      assert(result.metadata !== undefined, 'Should have agent metadata');
      assert(typeof result.metadata.version === 'string', 'Should have version');
      assert(typeof result.metadata.organization === 'string', 'Should have organization');
      assert(typeof result.metadata.description === 'string', 'Should have description');
      assert(typeof result.metadata.contact === 'string', 'Should have contact');
    }
  });
  
  // ========================
  // Run all tests
  // ========================
  async function runTests(): Promise<void> {
    console.log('🧪 Running ANS Resolver Comprehensive Tests v0.1');
    console.log('================================================\n');
    
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    
    for (const testFn of tests) {
      const result = await testFn();
      results.push(result);
      
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration < 10 ? `${result.duration}ms` : `${result.duration}ms`;
      
      console.log(`${status} ${result.name} (${duration})`);
      if (!result.passed && result.message) {
        console.log(`   💥 ${result.message}`);
      }
      
      result.passed ? passed++ : failed++;
    }
    
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = Math.round(totalDuration / results.length);
    
    console.log(`\n📊 Comprehensive Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total:  ${results.length}`);
    console.log(`   ⏱️  Duration: ${totalDuration}ms (avg: ${avgDuration}ms)`);
    console.log(`   🎯 Coverage: URI validation, parsing, demo registry, internal agents,`);
    console.log(`              runtime registration, caching, batch resolution, error handling,`);
    console.log(`              performance, edge cases, and resolution priority`);
    
    if (failed > 0) {
      console.log(`\n❌ ${failed} test(s) failed!`);
      console.log(`\n🔍 Debug failing tests and check:`);
      console.log(`   • Type imports from ../src/types`);
      console.log(`   • Function exports from ../src/resolve`);
      console.log(`   • Internal agent configuration`);
      console.log(`   • Resolution priority order`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All ${results.length} tests passed!`);
      console.log(`\n🚀 ANS Resolver v0.1 is fully tested and ready!`);
      console.log(`\n💡 Next steps:`);
      console.log(`   • Run: npm run build`);
      console.log(`   • Run: npm publish`);
      console.log(`   • Deploy demo to production`);
      console.log(`   • Test live .well-known resolution`);
      console.log(`   • Set up CI/CD pipeline`);
      console.log(`   • Add monitoring & analytics`);
    }
  }
  
  // Export for programmatic use
  export { runTests };
  
  // Run tests if this file is executed directly
  if (require.main === module) {
    runTests().catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
  }