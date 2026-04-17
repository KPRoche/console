## QUANTUM_AUTH_FIX_PLAN.md

```markdown
# Quantum Cards Live Data Fix - Development Plan

## Problem Statement
Quantum cards show demo data instead of live data despite:
- Quantum backend running (localhost:5000)
- Port-forward active
- Browser logged in via GitHub OAuth
- Console backend proxy configured correctly

**Root Cause**: JWT authentication middleware is rejecting requests, likely due to:
1. Cookie not being sent across ports (5174 → 8081)
2. Cookie validation issue in JWT middleware
3. Cookie not set with correct SameSite/Domain attributes

## Solution: Fix Cookie/Auth Flow (Option A)

### Phase 1: Investigate Current Auth State

**1.1 Check JWT Middleware Implementation**
- File: `pkg/middleware/auth.go`
- Look for: How JWT tokens are validated, cookie handling, cross-origin handling
- Question to answer: Does it properly handle cookies from different ports?

**1.2 Check Auth Handler (Token Creation)**
- File: `pkg/api/handlers/auth.go` 
- Look for: How `kc_auth` cookie is set, cookie attributes (SameSite, Domain, Path, Secure, HttpOnly)
- Question to answer: Is SameSite=Lax or Strict? Is Domain set correctly?

**1.3 Test Current Behavior**
- Start backend on port 8081 with dev mode
- Open browser console on localhost:5174
- Check Application → Cookies for `kc_auth` cookie
- Check if cookie is being sent in requests to `http://localhost:8081/api/quantum/status`
- Use browser Network tab to inspect request headers

### Phase 2: Fix Cookie Configuration

**2.1 Adjust Cookie Attributes** (if needed)
- File: Auth handler where `kc_auth` is set
- Changes:
  - Ensure `SameSite=Lax` (allows cross-site cookie for same protocol/domain)
  - Ensure `Domain=` is NOT set (allows any port on localhost)
  - Keep `HttpOnly=true` for security
  - Keep `Path=/` for all routes
  - Set `Secure=false` for local development (true in production)

**2.2 Verify CORS Headers** (if applicable)
- File: `pkg/api/server.go`
- Check if CORS middleware is configured correctly
- Ensure `Access-Control-Allow-Credentials: true` is set
- Ensure `Access-Control-Allow-Origin: http://localhost:5174` includes the frontend port

### Phase 3: Update Quantum Proxy Handler

**3.1 Ensure Auth Header Passthrough**
- File: `pkg/api/handlers/quantum.go` (QuantumProxyHandler)
- Verify: It copies all headers including Authorization
- Current: Lines 46-48 use `VisitAll()` to copy headers ✓
- Verify: If cookie is sent, it's included in the proxied request

**3.2 Test Direct Proxy**
- With curl from localhost:8081:
  ```bash
  curl -v http://localhost:8081/api/quantum/status
  # Should fail: "Missing authorization"
  
  curl -v -H "Authorization: Bearer <token>" http://localhost:8081/api/quantum/status
  # Should succeed if token is valid
  ```

### Phase 4: Fix Frontend Card Requests

**4.1 Verify Card is Sending Credentials**
- File: `web/src/components/cards/QuantumControlPanel.tsx`
- Check: Line 111 has `credentials: 'include'` ✓
- This should send the `kc_auth` cookie automatically

**4.2 Add Debug Logging**
- Modify card to log:
  - Request URL
  - Response status and error
  - Cookie presence (if possible from browser)
- This helps identify where requests fail

### Phase 5: Test in Both Dev and Production Modes

**5.1 Dev Mode Test**
```bash
./start-dev.sh
# Visit http://localhost:5174
# Browser should auto-login as dev-user
# Check if Quantum cards fetch live data
# Check Network tab for successful /api/quantum/* requests
```

**5.2 Production Mode Test**
```bash
# Requires GitHub OAuth credentials in .env
./startup-oauth.sh
# Visit http://localhost:5174
# Login with GitHub
# Check if Quantum cards fetch live data
# Verify behavior is same as dev mode
```

## Implementation Steps

### Step 1: Investigate
```bash
# Check current auth middleware implementation
cat pkg/middleware/auth.go | head -50

# Check cookie setup
grep -A 10 "kc_auth" pkg/api/handlers/auth.go

# Check CORS configuration
grep -B 5 -A 5 "cors\|Cors" pkg/api/server.go
```

### Step 2: Make Changes
- Edit `pkg/middleware/auth.go` if cookie attributes need adjustment
- Edit `pkg/api/handlers/auth.go` if cookie setup needs fixing
- Edit `pkg/api/server.go` if CORS needs adjustment
- Edit `web/src/components/cards/QuantumControlPanel.tsx` to add debug logging

### Step 3: Rebuild and Test
```bash
cd web && npm run build && npm run lint
./start-dev.sh
# Test in browser
```

### Step 4: Verify
- Quantum cards show live data (not demo badge/yellow outline)
- No console errors
- Both dev and production modes work
- Behavior is consistent

## Expected Outcome
- Quantum cards fetch live data from `/api/quantum/*` endpoints
- JWT auth works correctly across ports 5174 → 8081
- Cookie/token is properly passed through proxy
- Same behavior in dev and production modes
- No demo data fallback for authenticated requests

## Files to Review/Modify
1. `pkg/middleware/auth.go` — JWT validation logic
2. `pkg/api/handlers/auth.go` — Cookie creation
3. `pkg/api/server.go` — CORS/middleware setup
4. `pkg/api/handlers/quantum.go` — Proxy implementation
5. `web/src/components/cards/QuantumControlPanel.tsx` — Card request logic
6. `web/src/components/cards/QuantumQubitGrid.tsx` — Card request logic

## Success Criteria
- [ ] Quantum cards show live data (no yellow demo badge)
- [ ] Requests to `/api/quantum/*` succeed with 200 status
- [ ] Works in both dev mode (mock auth) and production (GitHub OAuth)
- [ ] No auth errors in browser console
- [ ] No regression in other cards or auth flow
```
