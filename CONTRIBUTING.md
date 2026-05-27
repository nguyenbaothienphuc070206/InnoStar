# Contributing Guide

## Branching

- Branch from `main` using feature branches: `feat/*`, `fix/*`, `chore/*`.
- Keep pull requests focused and small.

## Local Setup

1. Start infrastructure with Docker Compose.
2. Run frontend, backend, and ai-service locally if needed.
3. Ensure migration scripts are up to date.

## Pull Request Checklist

- Build passes for frontend and backend.
- AI service syntax check passes.
- New environment variables are documented in `.env.example`.
- Documentation is updated for API or behavior changes.

## Commit Style

Use conventional commits where practical:

- `feat:` new functionality
- `fix:` bug fix
- `chore:` maintenance and tooling
- `docs:` documentation
