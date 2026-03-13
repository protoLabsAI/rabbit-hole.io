# Proto Starter Kit

[![CI](https://github.com/proto-labs-ai/proto-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/proto-labs-ai/proto-starter/actions/workflows/ci.yml)
[![Release](https://github.com/proto-labs-ai/proto-starter/actions/workflows/release.yml/badge.svg)](https://github.com/proto-labs-ai/proto-starter/actions/workflows/release.yml)

**Enterprise-grade infrastructure for AI-powered startups. Ship faster, scale smarter.**

Build your SaaS product with production-ready infrastructure, AI agents, and deployment options from $0 to enterprise scale.

**[Contributing Guide](CONTRIBUTING.md)** | **[CI/CD Setup](docs/CI_CD_SETUP.md)**

---

## What You Get

**Complete Stack in Minutes:**

- ✅ Next.js 15 + React 19 with Turbopack
- ✅ AI agents (LangGraph + CopilotKit + OpenAI/Anthropic)
- ✅ Graph database (Neo4j 5.15 + GDS)
- ✅ Background jobs (Sidequest.js + real-time SSE notifications)
- ✅ Multi-tenancy (subdomain + path-based routing)
- ✅ Real-time collaboration (Yjs + Hocuspocus)
- ✅ Object storage (S3-compatible MinIO)
- ✅ Authentication (Clerk with tier system)
- ✅ Monitoring (Prometheus + Grafana + Loki + Tempo)
- ✅ Type-safe monorepo (pnpm workspaces + 15+ packages)

**Enterprise Infrastructure:**

- ✅ Three deployment options ($0 - $150/month)
- ✅ Terraform IaC with Cloudflare integration
- ✅ OWASP security compliance
- ✅ Production-tested patterns

---

## Quick Start (5 minutes)

### Development Environment

```bash
# Clone and install
git clone <your-repo>
cd rabbit-hole.io
pnpm install

# Start services (one command)
./scripts/dev-start-full.sh

# Start Next.js (new terminal)
pnpm dev

# Load test data
pnpm run db:dev

# Access application
open http://localhost:3000
```

**That's it.** Services running in Docker, Next.js native for fast hot reload (<1s).

### Check Status Anytime

```bash
./scripts/dev-status.sh
```

Shows: Docker services, Next.js, local staging - all in one view.

---

## Tech Stack

### Frontend

**Next.js 15 App Router:**

- React 19 with Server Components
- Turbopack for instant hot reload
- shadcn/ui + Tailwind CSS
- TypeScript strict mode
- Vitest + Cypress + Storybook

### Backend & Data

**APIs:** Next.js API routes  
**Graph:** Neo4j 5.15 + Graph Data Science  
**Relational:** PostgreSQL 15 (dual instances)

- App database (5432): User data, collaboration
- Job queue (5433): Background processing (Sidequest.js)

**Cache:** Redis 7 with persistence  
**Storage:** MinIO (S3-compatible)  
**Jobs:** Sidequest.js with real-time notifications (PostgreSQL LISTEN/NOTIFY)

### AI/ML Layer

**Agents:** LangGraph.js workflows  
**Frontend AI:** CopilotKit integration  
**LLMs:** OpenAI GPT-4, Anthropic Claude, Gemini  
**Tools:** Wikipedia API, entity research, relationship extraction

### Collaboration & Real-Time

**Real-time Editing:** Yjs CRDT + Hocuspocus (WebSocket)  
**Job Notifications:** PostgreSQL LISTEN/NOTIFY + Server-Sent Events (<100ms)  
**Persistence:** y-indexeddb + PostgreSQL  
**Multi-user:** Concurrent editing with conflict resolution

### Auth & Multi-Tenancy

**Auth:** Clerk with organizations  
**Tiers:** Free, Pro, Enterprise  
**Routing:** Subdomain (`tenant.domain.io`) + path (`/v1/{hash}/`)  
**Quotas:** Entity limits, storage, API calls

### Observability

**Metrics:** Prometheus + Grafana  
**Logs:** Loki + structured logging  
**Traces:** Tempo (OpenTelemetry)  
**Dashboards:** Pre-configured for services

---

## Monorepo Structure

```
packages/
├── @proto/types          # Zod schemas + TypeScript types
├── @proto/utils          # Graph algorithms + helpers
├── @proto/database       # Neo4j + PostgreSQL clients
├── @proto/auth           # Clerk integration + tier enforcement
├── @proto/llm-tools      # AI workflows + LangGraph
├── @proto/api-utils      # API middleware + utilities
└── @proto/prompts        # LLM prompts + templates

agent/                    # LangGraph AI agents (port 8123)
services/                 # Microservices (Hocuspocus, etc.)
```

**Type-safe imports across packages.** Change once, update everywhere.

---

## Three Deployment Options

### Option 1: Local Staging (✅ Deployed)

**For:** Development + team testing  
**Cost:** $0/month  
**Time:** 1-2 days

```bash
# Already running with Traefik + 3-tier networks
./scripts/start-local-staging.sh
open https://app.localhost

# Access via Tailscale VPN
tailscale ip -4  # Share this IP with team
```

**Architecture:** Traefik → Docker → 3-tier networks → Tailscale VPN

**Docs:** [deployment/local-staging/](deployment/local-staging/)

### Option 2: Cloudflare DNS + WAF (📚 Ready)

**For:** Public access + production  
**Cost:** $0/month (Free tier)  
**Time:** 2-3 hours

```bash
# Setup Cloudflare account
# Add rabbit-hole.io domain

# Deploy DNS via Terraform
cd deployment/terraform/environments/staging
terraform apply

# Access with full security
open https://app.rabbit-hole.io
```

**Features:**

- Wildcard DNS (\*.rabbit-hole.io auto-resolves)
- WAF with OWASP rules
- Bot Fight Mode
- DDoS protection (unlimited)
- CDN caching (global)

**Docs:** [deployment/dns-cloudflare/](deployment/dns-cloudflare/)

### Option 3: AWS Staging (📚 Documented)

**For:** Enterprise + cloud-native  
**Cost:** $100-150/month  
**Time:** 4-6 weeks

```bash
# Deploy complete AWS infrastructure
cd deployment/terraform/environments/staging
terraform apply

# Auto-scaling ECS, RDS, ElastiCache, S3
# CloudWatch monitoring, ALB routing
```

**Docs:** [deployment/staging/](deployment/staging/) + [deployment/terraform/](deployment/terraform/)

---

## Production Roadmap

### Phase 1: Validate Locally (Weeks 1-2)

- [ ] Run local staging
- [ ] Test all features
- [ ] Fix bugs
- [ ] Get team feedback via Tailscale

**Cost:** $0

### Phase 2: Add DNS (Week 3)

- [ ] Set up Cloudflare account
- [ ] Deploy DNS via Terraform
- [ ] Enable WAF + Bot Protection
- [ ] Test public access

**Cost:** $0 (Free tier)

### Phase 3: Production Server (Week 4)

- [ ] Deploy to VPS or dedicated server
- [ ] Point DNS to server IP
- [ ] Configure SSL (Origin cert or Let's Encrypt)
- [ ] Lock firewall to Cloudflare IPs

**Cost:** $20-60/month (server) + $0 (Cloudflare)

### Phase 4: Scale to AWS (Optional)

- [ ] Deploy Terraform AWS infrastructure
- [ ] Migrate to managed services (RDS, ElastiCache)
- [ ] Enable auto-scaling
- [ ] Configure CloudWatch

**Cost:** $100-150/month (staging), $300-500/month (production)

---

## Security & Compliance

**Built-in from day 1:**

- ✅ OWASP security headers (12+)
- ✅ Content Security Policy (CSP)
- ✅ TypeScript strict mode
- ✅ Input validation (Zod schemas)
- ✅ Rate limiting ready
- ✅ CORS configured
- ✅ Environment-based secrets

**When you add Cloudflare:**

- ✅ WAF (OWASP Top 10)
- ✅ Bot Fight Mode
- ✅ DDoS protection
- ✅ Rate limiting (100 req/min)
- ✅ Custom firewall rules

---

## Documentation

### Quick References

- **[Quick Start Guide](deployment/dev/LOCAL_DEVELOPMENT_DEPLOYMENT.md)** - Get started in 5 minutes
- **[Architecture Overview](docs/developer/architecture/README.md)** - Understand the stack
- **[Deployment Options](deployment/STAGING_OPTIONS_SUMMARY.md)** - Compare local vs. AWS

### Infrastructure Guides

- **[Local Staging](deployment/local-staging/)** - $0/month production patterns
- **[DNS & Cloudflare](deployment/dns-cloudflare/)** - Public access + security
- **[AWS Staging](deployment/staging/)** - Cloud deployment
- **[Terraform Docs](deployment/terraform/)** - Complete IaC

### Deep Dives

- **[AI/ML Architecture](docs/developer/architecture/05-ai-ml/)** - LangGraph agents
- **[Database Schema](docs/developer/architecture/04-database/)** - Neo4j + PostgreSQL
- **[Auth & Multi-Tenancy](docs/developer/architecture/08-auth/)** - Clerk + tiers
- **[API Reference](docs/developer/API_REFERENCE_RABBIT_HOLE.md)** - 70+ endpoints

---

## Why Proto?

### For Founders

**Ship faster:**

- Infrastructure done (save 3-6 months)
- AI agents ready (LangGraph + CopilotKit)
- Multi-tenancy built-in
- Production deployment options

**Cost-effective:**

- Free local staging (validate before AWS)
- $0/month Cloudflare (WAF + CDN included)
- Scale when revenue justifies

**Enterprise-ready:**

- OWASP compliant
- Terraform IaC
- Monitoring included
- Security by default

### For Developers

**Modern stack:**

- Next.js 15 + React 19 (latest)
- TypeScript strict (type-safe)
- Monorepo (pnpm workspaces)
- Hot reload <1s

**AI-native:**

- LangGraph workflows
- CopilotKit integration
- Multi-LLM support
- Prompt management

**Great DX:**

- Native Next.js (fast iteration)
- Full IDE integration
- Comprehensive testing
- Rich documentation

---

## What Makes This Different

**Most starter kits give you:**

- Basic Next.js setup
- Maybe a database
- "Good luck with deployment"

**Proto gives you:**

- Complete infrastructure (local → AWS)
- AI agents ready to customize
- Multi-tenant architecture
- Three deployment options
- 21,000+ lines of production docs
- Enterprise patterns from day 1

**You're not starting from scratch. You're starting from production-ready.**

---

## Quick Links

| Resource                                                      | Description                 |
| ------------------------------------------------------------- | --------------------------- |
| [Quick Start](deployment/dev/LOCAL_DEVELOPMENT_DEPLOYMENT.md) | Get running in 5 minutes    |
| [Architecture](docs/developer/architecture/README.md)         | Understand the stack        |
| [Local Staging](deployment/local-staging/)                    | $0/month production testing |
| [Cloudflare DNS](deployment/dns-cloudflare/)                  | Public access + security    |
| [AWS Deployment](deployment/staging/)                         | Cloud-scale infrastructure  |

---

## Cost Breakdown

| Deployment         | Monthly  | Annual       | Use Case            |
| ------------------ | -------- | ------------ | ------------------- |
| **Local Dev**      | $0       | $0           | Feature development |
| **Local Staging**  | $0       | $0           | Production testing  |
| **+ Cloudflare**   | $0       | $0           | Public access + WAF |
| **VPS Server**     | $20-60   | $240-720     | Small production    |
| **AWS Staging**    | $100-150 | $1,200-1,800 | Cloud validation    |
| **AWS Production** | $300-500 | $3,600-6,000 | Enterprise scale    |

**Start at $0, scale when revenue justifies.**

---

## Deployment in Three Steps

### 1. Validate Locally (Free)

```bash
./scripts/start-local-staging.sh
# Test via Tailscale with team
# $0/month
```

### 2. Add DNS & Security (Still Free)

```bash
cd deployment/dns-cloudflare
# Follow IMPLEMENTATION_HANDOFF.md
# $0/month (Cloudflare Free tier)
```

### 3. Deploy to Production

**Option A: VPS** ($20-60/month)

```bash
# Copy to server, start services
# Small to medium traffic
```

**Option B: AWS** ($300-500/month)

```bash
# Terraform deployment
# Auto-scaling, managed services
```

**Full guides:** [deployment/](deployment/)

---

## Built-In Best Practices

### Code Quality

- TypeScript strict mode enforced
- ESLint + Prettier configured
- Husky git hooks (pre-commit, pre-push)
- Circular dependency detection
- Bundle size monitoring

### Testing

- Vitest (unit tests, 338+ tests)
- Cypress (e2e, 52+ tests)
- Storybook (component dev)
- React Testing Library

### Performance

- Redis caching strategy
- CDN-ready (Cloudflare)
- Lazy loading patterns
- Bundle optimization

### Security

- OWASP headers
- CSP configured
- Rate limiting ready
- Secrets management
- Terraform for IaC

---

## Infrastructure Stats

**Deployment options:** 3 complete paths  
**Time saved:** 180+ hours of infrastructure work  
**Cost saved:** $1,800-3,000/year vs. traditional approach  
**Ready for:** Development → Staging → Production

---

## Tech Stack Deep Dive

**See:** [docs/developer/architecture/README.md](docs/developer/architecture/README.md)

**Frontend:** Next.js 15, React 19, Tailwind, shadcn/ui, React Flow  
**Backend:** Neo4j, PostgreSQL, Redis, MinIO, SideQuest.js  
**AI/ML:** LangGraph, CopilotKit, OpenAI, Anthropic, Gemini  
**Auth:** Clerk (organizations + tiers)  
**Infra:** Docker, Traefik, Terraform, Cloudflare  
**Monitoring:** Prometheus, Grafana, Loki, Tempo

**Detailed architecture diagrams, component docs, and integration guides available.**

---

## Perfect For

### AI-Powered SaaS

- LangGraph agents ready to customize
- CopilotKit chat interface
- Multi-LLM support (OpenAI, Anthropic, Gemini)
- Prompt management system

### Knowledge Management

- Graph database (Neo4j)
- Entity relationships
- Evidence tracking
- Timeline analysis

### Multi-Tenant Platforms

- Subdomain routing built-in
- Per-tenant quotas
- Organization-based isolation
- Custom domain support (Enterprise tier)

### Research Platforms

- Evidence-based workflows
- Source provenance tracking
- Collaborative editing (Yjs)
- Export and sharing

---

## Get to Market Faster

**Traditional approach:**

- 3 months: Set up infrastructure
- 2 months: Add authentication
- 2 months: Deploy to production
- 1 month: Add monitoring
- **Total: 8 months before launch**

**With Proto:**

- Week 1: Start building features (infrastructure done)
- Week 2-4: MVP complete
- Week 5: Local staging validation
- Week 6: Production deployment
- **Total: 6 weeks to launch**

**Save 6+ months of infrastructure work.**

---

## Learn More

### Getting Started

1. **[Quick Start Guide](deployment/dev/LOCAL_DEVELOPMENT_DEPLOYMENT.md)** - Your first 5 minutes
2. **[Architecture Overview](docs/developer/architecture/README.md)** - Understand the system
3. **[Development Workflow](docs/developer/)** - Best practices

### Deployment

1. **[Local Staging](deployment/local-staging/)** - $0/month production testing
2. **[Cloudflare DNS](deployment/dns-cloudflare/)** - Public access + security
3. **[AWS Deployment](deployment/staging/)** - Enterprise scale

### Advanced Topics

- **[AI Agents](docs/developer/architecture/05-ai-ml/)** - LangGraph customization
- **[Multi-Tenancy](docs/developer/multi-tenancy-implementation.md)** - Subdomain routing
- **[Security](docs/developer/NEXTJS_PRODUCTION_OPTIMIZATIONS.md)** - OWASP compliance
- **[Testing](docs/developer/TESTING_GUIDE.md)** - Vitest + Cypress

---

## What You Can Build

**Examples using this stack:**

- **SaaS platforms** with AI copilots
- **Knowledge bases** with graph relationships
- **Research tools** with evidence tracking
- **Collaborative platforms** with real-time editing
- **Multi-tenant applications** with subdomain routing
- **Data analytics** with graph algorithms
- **Internal tools** with enterprise auth

**The infrastructure scales from MVP to millions of users.**

---

## Support

### Quick Help

```bash
# Something not working?
./scripts/dev-status.sh        # Check what's running

# Services not starting?
docker compose -f docker-compose.neo4j.yml logs

# Next.js issues?
pnpm install && pnpm build:libs
```

### Documentation

- **[Troubleshooting](docs/developer/)** - Common issues
- **[Architecture Docs](docs/developer/architecture/)** - System deep dive
- **[Deployment Guides](deployment/)** - Infrastructure setup

---

## By the Numbers

**Infrastructure:**

- 3 deployment options (local → cloud)
- $0 - $150/month cost range
- 180+ hours of work pre-done
- 21,300+ lines of docs

**Tech Stack:**

- 10+ monorepo packages
- 70+ API endpoints
- 338+ unit tests
- 52+ e2e tests

**AI/ML:**

- 4 LangGraph agents
- 3+ LLM providers
- 81% confidence AI research
- CopilotKit integration

---

## Start Building

```bash
# 1. Clone
git clone <your-repo>
cd rabbit-hole.io

# 2. Install
pnpm install

# 3. Start (one command)
./scripts/dev-start-full.sh

# 4. Build features
pnpm dev

# 5. Deploy when ready
# Choose: Local + Cloudflare ($0) or AWS ($100-500/month)
```

**Documentation:** [deployment/](deployment/) for all deployment options

---

**Enterprise infrastructure. Startup speed. AI-native. Production-ready.**

**See also:** [README.md.backup](README.md.backup) (original detailed documentation)

**Get started:** `./scripts/dev-start-full.sh`
