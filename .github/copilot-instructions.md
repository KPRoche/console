# Copilot Instructions for KubeStellar Console

## MANDATORY: Build and Lint Before Every Commit

**YOU MUST RUN THESE COMMANDS BEFORE EVERY SINGLE COMMIT:**

```bash
cd web
npm run build
npm run lint
```

**IF BUILD FAILS → FIX IT → RUN AGAIN**
**IF LINT FAILS → FIX IT → RUN AGAIN**
**ONLY COMMIT AFTER BOTH PASS**

DO NOT PUSH CODE THAT FAILS BUILD OR LINT. This is non-negotiable.

## Commit Workflow

1. Make code changes
2. `cd web && npm run build` - MUST PASS
3. `cd web && npm run lint` - MUST PASS
4. `git add .`
5. `git commit -m "message"`
6. Push

## Project Structure

- Frontend: React + TypeScript in `/web/`
- Backend: Go in root directory
- Build: `npm run build` in web directory
- Lint: `npm run lint` in web directory

## Code Standards

### TypeScript
- Use explicit types (no `any`)
- Functional components with hooks
- Verify imports exist before using them

### Before Using a Function
- Search the codebase to verify it exists
- Check the correct import path
- Never call undefined functions

## PR Requirements

- Include `Fixes #ISSUE_NUMBER` in PR body
- All commits must pass build and lint
- Keep changes focused on the issue
