# RecallNet Documentation

RecallNet is a **proactive product recall intelligence graph** for consumers. Upload retail purchase history → match against official recall events → receive explainable alerts with remedy eligibility.

Built for [H0: Hack the Zero Stack](https://h01.devpost.com/) — **Next.js on Vercel** + **Amazon DynamoDB**.

## Documentation index

| Document | Audience | Contents |
| -------- | -------- | -------- |
| [Architecture](./ARCHITECTURE.md) | Engineers, judges | System design, data model, event flows, DynamoDB access patterns |
| [Deployment](./DEPLOYMENT.md) | DevOps, hackathon setup | Local dev, Terraform/AWS, Vercel, env vars, verification |
| [Implementation](./IMPLEMENTATION.md) | Developers | Codebase layout, modules, matching engine, hero features |
| [API Reference](./API.md) | Integrators | REST endpoints, request/response schemas |
| [Testing Guide](./TESTING.md) | QA, developers | Test CSVs, curl examples, expected results |

## Related files

| File | Purpose |
| ---- | ------- |
| [terraform/README.md](../terraform/README.md) | Terraform quick reference |
| [README.md](../README.md) | Project quick start |

## Stack at a glance

```
Browser (Next.js UI)
       │
       ▼
Vercel Serverless (Route Handlers)
       │
       ▼
Amazon DynamoDB (4 tables, 4 GSIs)
       ▲
       │
Terraform (IaC provisioning)
```

## Quick commands

```bash
# Local development (in-memory store)
cp .env.example .env.local && npm install && npm run dev

# AWS infrastructure
npm run infra:deploy

# Seed production DynamoDB
npm run infra:seed

# Deploy frontend
vercel --prod
```

## Demo URLs (local: http://localhost:3001)

| URL | Purpose |
| --- | ------- |
| `/upload` | Upload your order CSV — live CPSC matching |
| `/dashboard` | Your alerts after upload |
| `/graph` | Safety Graph visualization |
| `/recalls` | Live CPSC recall feed + sync |
