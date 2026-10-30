> Continuation of the `security-and-hardening` skill (see `../SKILL.md`). Text unchanged from upstream.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal tool, security doesn't matter" | Internal tools get compromised. Attackers target the weakest link. |
| "We'll add security later" | Security retrofitting is 10x harder than building it in. Add it now. |
| "No one would try to exploit this" | Automated scanners will find it. Security by obscurity is not security. |
| "The framework handles security" | Frameworks provide tools, not guarantees. You still need to use them correctly. |
| "It's just a prototype" | Prototypes become production. Security habits from day one. |
| "Threat modeling is overkill here" | Five minutes of "how would I attack this?" prevents the design flaws no control can patch later. |
| "It's just LLM output, it's only text" | That "text" can be a SQL statement, a script tag, or a shell command. Treat it like any untrusted input. |
| "The audit passed, so the dependency is safe" | Audits match known advisories. They do not detect a newly malicious package or make unreviewed install scripts safe to execute. |
| "Collect it now, we might need it later" | Data you don't hold can't be breached, subpoenaed, or mis-deleted. "Might need it" is breach scope, not a purpose. |
| "We'll handle deletion requests manually" | Manual erasure misses backups, caches, and analytics copies. If the schema can't find a user's data, you can't honor the request — design for it. |
| "Compliance is legal's problem, not ours" | Export, deletion, retention, and consent are schema and code. Legal can't bolt them on after you've smeared PII across ten systems. |

## Red Flags

- User input passed directly to database queries, shell commands, or HTML rendering
- A delete, move, or overwrite whose target comes from a payload, a config value, or another process's command line, guarded only by a shape check on the path
- Secrets in source code or commit history
- API endpoints without authentication or authorization checks
- Missing CORS configuration or wildcard (`*`) origins
- No rate limiting on authentication endpoints, or an in-memory limiter in front of more than one instance
- Stack traces or internal errors exposed to users
- Dependencies with known critical vulnerabilities, competing lockfiles at one installation boundary, non-reproducible installs, or blanket-approved scripts
- Server fetches user-supplied URLs without an allowlist (SSRF)
- LLM/model output passed into a query, the DOM, a shell, or `eval`
- Secrets, PII, or the full system prompt placed inside an LLM context window
- Personal data collected with no stated purpose, retention limit, or deletion path
- PII sent to analytics/ad/LLM vendors with no consent or data-processing agreement
- "Delete my account" that only flips a flag while the personal data lingers in stores and backups

## Verification

After implementing security-relevant code:

- [ ] The native audit has no unmitigated reachable critical/high findings; CI preserves the authoritative lockfile and blocks unreviewed dependency scripts
- [ ] No secrets in source code or git history
- [ ] All user input validated at system boundaries
- [ ] Destructive filesystem operations resolve symlinks, then verify allowlisted root, minimum depth, and ownership before running
- [ ] Authentication and authorization checked on every protected endpoint
- [ ] Security headers present in response (check with browser DevTools)
- [ ] Error responses don't expose internal details
- [ ] Rate limiting active on auth endpoints, backed by a shared store when more than one instance serves traffic
- [ ] Server-side URL fetches validated against an allowlist (no SSRF)
- [ ] LLM/model output validated and encoded before use (if AI features present)
- [ ] Personal data is classified, minimized to a stated purpose, and has a retention limit
- [ ] Deletion and export requests work end-to-end (including backups, caches, and analytics copies)
