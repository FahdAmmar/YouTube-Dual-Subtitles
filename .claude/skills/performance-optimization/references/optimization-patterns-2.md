> Continuation of the `performance-optimization` skill (see `optimization-patterns.md`). Text unchanged from upstream.

## Large Bundle Size

```typescript
// Modern bundlers (Vite, webpack 5+) handle named imports with tree-shaking automatically,
// provided the dependency ships ESM and is marked `sideEffects: false` in package.json.
// Profile before changing import styles — the real gains come from splitting and lazy loading.

// GOOD: Dynamic import for heavy, rarely-used features
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// GOOD: Route-level code splitting wrapped in Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

## Missing Caching (Backend)

Cache what is expensive to produce and read far more often than it changes. Caching a query that was already fast adds a network hop, a staleness bug, and an eviction policy to maintain, in exchange for nothing.

**Pick the layer deliberately:**

| Layer | Visible to | Use when | Cost |
|---|---|---|---|
| In-process (`Map`, LRU) | One instance | Small, hot, per-instance staleness is acceptable | Each instance drifts independently; invalidation reaches only one |
| Shared (Redis, Memcached) | All instances | Instances must agree, or the value is expensive to recompute | A network hop, and another service to run and monitor |
| CDN / edge | Everyone, per URL | Responses are public and identical for a given key | Invalidation is the hard part; assume you cannot recall a bad response quickly |

```typescript
// Cache frequently-read, rarely-changed data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// HTTP caching headers for static assets
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache for 1 year
  immutable: true,        // Never revalidate (use content hashing in filenames)
}));

// Cache-Control for API responses
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
```

**Key design decides correctness.** Every input that changes the response belongs in the key: tenant, locale, permissions, feature flags. A key that omits the viewer is how one user's data gets served to another, and that ships as a performance win.

**Choose one invalidation strategy, not three:**

| Strategy | Trade-off |
|---|---|
| TTL | Simplest. You accept staleness up to the TTL, so state the acceptable window explicitly |
| Event or tag based | Fresh on write, but writers now have to know the cache topology |
| Versioned keys (`user:42:profile:v7`) | Never invalidate, just stop reading old keys. Costs memory until eviction |

**Guard against the stampede.** A hot key expires, every concurrent request misses together, and the origin takes the full load at once, which is how a cache turns into an outage instead of preventing one. Serve stale while a single request recomputes (`stale-while-revalidate`), or coalesce concurrent misses behind one in-flight promise so N waiters cause one recompute.

**Do not cache:** anything whose staleness is a correctness bug (balances, permissions, inventory at checkout), or per-user data under a key that does not identify the user. See `../../../references/performance-checklist.md#caching-strategies` for request coalescing, write strategies, negative caching, and the cache checklist.
