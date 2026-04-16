# Security Policy

## Supported Versions

This repository is in active development. The `main` branch is supported.

## Reporting a Vulnerability

1. Do not create a public issue for security vulnerabilities.
2. Report privately by email to the maintainers.
3. Include reproduction steps, affected components, and potential impact.

We aim to acknowledge reports within 72 hours and provide a remediation plan.

## Security Baseline

- JWT-based authentication with role-based access control for sensitive endpoints.
- Global request tracing and uniform error envelopes.
- Throttling and security headers enabled by default.
- Migration-first database lifecycle in production mode.
- Automated dependency updates and CI security scanning.
