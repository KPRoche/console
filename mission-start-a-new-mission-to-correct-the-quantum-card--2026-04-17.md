# Mission: Start a new mission to correct the Quantum Card...

**Type:** custom
**Status:** completed
**Started:** 4/17/2026, 10:22:41 AM
**Agent:** claude-code


---

## Conversation

### User (4/17/2026, 10:22:41 AM)

Start a new mission to correct the Quantum Card live data problem:

### System (4/17/2026, 10:24:01 AM)

> **Agent Disconnected**

The WebSocket connection to the agent at `ws://127.0.0.1:8585/ws` was lost. Please verify the agent is running and reachable.

### User (4/17/2026, 11:08:28 AM)

The Quantum-kc-demo pod is running and the portforward is active. The cards are still only showing demo data.

### claude-code (4/17/2026, 11:08:33 AM)

I'll investigate why the Quantum cards are showing only demo data despite the pod and port-forward being active. Let me check the current state.Good, port-forward is active. Now let me check if the backend is actually responding:The `/api/health` endpoint doesn't exist. Let me check what endpoints are available:The backend is running a web dashboard. Let me check the memory to understand what API endpoints should be available:Now let me test the actual API endpoints to see what's happening:Perfect! The backend is responding. Now let me check the QuantumControlPanel card to see why it's not fetching live data:Let me continue reading the component to see the fetch logic:**Found the issue!** The card is trying to fetch from `/api/quantum/status` (line 108) but the backend API is at `http://localhost:5000/api/status`. This is a URL routing problem.

Let me check how the console backend is configured:Let me find where the Quantum routes are registered:Good, I can see the Quantum proxy is registered at `/quantum/*`. Let me check the QuantumProxyHandler:

### claude-code (4/17/2026, 11:09:07 AM)

Perfect! So the backend proxy is configured correctly. The console should be proxying requests from `/api/quantum/*` to `http://localhost:5000/*`. Let me test if the console backend is running:Great! The console backend is running. Let me test if the proxy is working:**Aha! There's the real issue!** The backend requires authorization. Let me check the memory for details about the OAuth authentication issue:Perfect! I found the root cause documented in memory. The issue is **JWT authentication is required**. Let me verify what's happening:Let me check the auth middleware to understand what's protected:Now let me check the browser to see if the user is actually logged in. Let me test by checking the dev console or opening the frontend:Good, the auth middleware is working. The problem is: **the browser has no valid JWT token yet because the user hasn't logged in with GitHub OAuth**. 

Let me create a task to track the investigation and solution:

## Problem Summary

The Quantum cards are stuck in demo mode because:

1. **Backend requires JWT authentication** — all `/api/quantum/*` requests need a valid JWT token
2. **User hasn't logged in yet** — without GitHub OAuth login, there's no `kc_auth` JWT cookie
3. **Card detects 3 consecutive failures** → falls back to demo data with yellow badge
4. **Port-forward and API proxy are both working correctly** — the infrastructure is set up properly

## Solution

**You need to log in with GitHub OAuth first.** The credentials must be configured in `.env`:

```bash
cat << 'EOF' > /home/kproche/new-console/console/.env
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
EOF
```

Then visit http://localhost:5174 in your browser and click "Login with GitHub" to authenticate. Once you have the JWT cookie, the Quantum card requests will work and you'll see live data instead of the demo fallback.

Would you like me to help with:
1. Setting up GitHub OAuth credentials?
2. Starting fresh with `./start-dev.sh` instead (no OAuth, just mock dev-user)?
3. Something else?

### claude-code (4/17/2026, 11:09:31 AM)

Good, the auth middleware is working. The problem is: **the browser has no valid JWT token yet because the user hasn't logged in with GitHub OAuth**. 

Let me create a task to track the investigation and solution:

## Problem Summary

The Quantum cards are stuck in demo mode because:

1. **Backend requires JWT authentication** — all `/api/quantum/*` requests need a valid JWT token
2. **User hasn't logged in yet** — without GitHub OAuth login, there's no `kc_auth` JWT cookie
3. **Card detects 3 consecutive failures** → falls back to demo data with yellow badge
4. **Port-forward and API proxy are both working correctly** — the infrastructure is set up properly

## Solution

**You need to log in with GitHub OAuth first.** The credentials must be configured in `.env`:

```bash
cat << 'EOF' > /home/kproche/new-console/console/.env
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
EOF
```

Then visit http://localhost:5174 in your browser and click "Login with GitHub" to authenticate. Once you have the JWT cookie, the Quantum card requests will work and you'll see live data instead of the demo fallback.

Would you like me to help with:
1. Setting up GitHub OAuth credentials?
2. Starting fresh with `./start-dev.sh` instead (no OAuth, just mock dev-user)?
3. Something else?

### User (4/17/2026, 11:09:50 AM)

The console is ALREADY logged in via github

### claude-code (4/17/2026, 11:09:55 AM)

Got it! If the console is already logged in via GitHub, then the JWT token should be present. Let me investigate why the Quantum cards are still showing demo data despite having valid authentication.The API is returning "Missing authorization" even when trying to authenticate. Let me check if there's an issue with how the token is being passed. Let me look at the current authentication setup:Let me check the middleware files:Let me check the auth middleware function that validates requests:Now I understand the auth middleware. The JWT token should be in the `kc_auth` cookie. Let me check how the QuantumControlPanel card is making requests and if it's including credentials:Good! The card is using `credentials: 'include'` on line 111, which should include the JWT cookie. The problem is likely that the request to `/api/quantum/status` is being rejected by the auth middleware on the console backend.

Let me check how the quantum proxy is set up in the server:I see! The quantum routes are registered as `/quantum/*`, but the card is requesting `/api/quantum/status`. Let me check the routes structure more carefully:Now let me check where the auth middleware is applied. Let me look earlier in the server.go file:Perfect! I found it! On line 676, the `/api` group has `middleware.JWTAuth()` applied. This means the quantum routes at `/api/quantum/*` ARE protected by auth middleware. Let me verify that the browser cookie is actually being sent. Let me check the browser's network tab by testing this with curl including the auth header check:

### claude-code (4/17/2026, 11:10:44 AM)

OK, so the auth middleware is working properly. Let me check if the browser session actually has a valid `kc_auth` cookie by looking at the browser console or checking what cookies are available:The frontend is running. Let me check the browser console logs to see what's happening. Let me test directly if the card is getting authenticated requests through by checking the server logs:Good, I can see the backend is running on port 8081 (not 8080 - that's interesting). Let me check if there are actually valid tokens being used. Let me look at the browser to understand the real issue. Let me check what the actual error is by opening the browser dev tools. First, let me see if there's a way to test the actual JWT token:So even without auth, it requires a token. But wait - I see the backend is running on port **8081**, not 8080! Let me check if the frontend is configured to hit the correct port:Let me check where the frontend makes API calls from:Let me check how frontend makes API requests to the backend:The frontend requests are likely relative URLs, so they'll use the same host. Let me check if the issue is that the QuantumControlPanel card is actually not making the requests at all. Let me look at its error handling or check the memory for more info about this specific issue:Ah! So the memory says the browser must be logged in with GitHub, but the user says it's ALREADY logged in. Let me check what's actually happening. Let me verify that the JWT cookie is actually present in the browser by testing a direct API call with proper auth:So all API routes require auth. Let me check the server logs to see if there are actual authenticated requests coming in. Let me look for a running process log or check the console output:The console backend is running on port 8081. Now let me check what the actual issue is. The user says they're already logged in. Let me investigate if the token is actually being used. Let me first understand the current state better by checking if there's a dev-mode option:Let me check if dev mode gives automatic authentication:Let me check if dev mode bypasses auth anywhere:Let me check if the dev-user token is being used:Interesting! So `demo-token` is rejected. Let me check the auth handler to see how dev mode users get tokens:

### User (4/17/2026, 11:12:39 AM)

still working?

### claude-code (4/17/2026, 11:12:44 AM)

Yes, I'm still here and investigating! Let me check the current state of the console and backend to understand why the Quantum cards are showing demo data despite GitHub login.Let me test with a cookie to simulate the logged-in state:Good — the auth check is running. Now let me check if there's a valid dev token or if we need to look at the actual browser network traffic. Let me check the QuantumControlPanel component to see what URL it's actually requesting:The card is requesting `/api/quantum/status` with credentials included. The issue is clear: **the backend is rejecting all requests as "Missing authorization" even though the browser is logged in**.

Let me check if there's an issue with how the auth middleware is validating the cookie:Good! The backend is running on port **8081** (not 8080). Let me check if the frontend is pointing to the correct backend port. The card is requesting `/api/quantum/status` which is a relative URL, so it should hit the same host. But let me verify the backend is actually listening:Let me check if the console backend is correctly proxying to the quantum backend. Let me look at the quantum proxy handler to understand the complete flow:Let me check where the quantum proxy handler is registered:I see the issue! The quantum routes are registered as `/api/quantum/*` (line 1067), but they're protected by JWT auth on the `/api` group. Let me check if the handler is actually receiving auth. Let me look at the QuantumProxyHandler:Good! Let me check the quantum proxy handler:Perfect! Now I see the full picture. The proxy handler copies all headers (line 46-48), so it should be passing through the `Authorization` header if present. Let me test if the quantum backend at localhost:5000 is actually responding:Excellent! The quantum backend is responding directly. Now let me test the proxy through the console backend:There's the problem! The JWT auth middleware is blocking the quantum proxy requests. Let me check what token format the console expects. Let me look at how the auth middleware checks for valid tokens:Let me find the auth middleware:Let me check the auth middleware:Now I understand! The auth middleware checks for a valid JWT token in three places (line 223-244):
1. `Authorization: Bearer <token>` header
2. `kc_auth` cookie
3. `_token` query param (only for `/stream` endpoints)

The cards are making requests with `credentials: 'include'` which should send the `kc_auth` cookie. **The real issue is: the browser cookie should be there if the user is logged in.**

Let me check if the browser has the cookie by testing from the browser's perspective. Let me access the console and check the Application tab for cookies. First, let me see if there's a way to generate a test token:Let me test what cookies are currently being sent from localhost. The **KEY insight** is: you said the console is already logged in. Let me verify if the `kc_auth` cookie exists:Interesting! Rate limiting is kicking in. Let me check if there's a development mode that bypasses auth. Let me look at how the dev mode is configured:Let me check line 1084 - does dev mode skip JWT auth?Let me search for where the auth middleware is actually applied to see if it's conditional on dev mode:There it is! Line 676 shows that JWTAuth is **always applied** to the `/api` group, regardless of dev mode. The problem is clear now.

**Let me check if there's actually a way to bypass it in dev mode by looking at how the auth gets created:**I'm on the `feature/quantum-api-proxy` branch. Let me check if this branch has the JWT issue. Let me look at when the auth was recently modified:**Now I see the real problem!** The browser is authenticated (with a JWT cookie), but the cookie isn't being sent in the proxy requests. This could be a CORS issue or the cookie not being set with the correct scope.

Let me check what the **actual startup command** was that started this backend instance:The backend is running with `--backend-port 8081`. This is the key issue: **the browser is on port 5174, but the API backend is on port 8081.**

Cookies have **same-origin policy** — cookies set on localhost:8081 won't be sent to localhost:8081 from localhost:5174 unless they're explicitly set with no Domain restriction.

Let me check how the cookie is being set in the auth handler:Let me continue reading to see how the cookie is set:Let me check lines 711 and 725 where the cookie is set:

### User (4/17/2026, 11:17:52 AM)

Would the behavior be different if I was not running in dev mode? The goal is to have the quantum cards to behave properly in either mode

### claude-code (4/17/2026, 11:17:57 AM)

Let me investigate how the auth and Quantum card behavior differs between dev mode and production mode.Let me check how the JWT auth middleware is implemented and whether dev mode affects it:Now let me check the JWT auth middleware implementation to see if dev mode affects it:Perfect! Now I can see the issue clearly. The JWT auth middleware **does NOT check dev mode** — it always requires a valid JWT token regardless of whether you're in dev mode or production mode.

Let me check the Quantum proxy handler to see how it passes through the auth:Now let me check how the quantum routes are registered and whether they're protected by auth:

### claude-code (4/17/2026, 11:18:20 AM)

Perfect! Now I have the full picture. Let me summarize the findings:

## Analysis: Dev Mode vs Production Mode

**The behavior is THE SAME in both modes** — the Quantum cards show demo data in both because:

1. **JWT Auth is ALWAYS Required** (lines 676, 1067-1068):
   - The `/api` group ALWAYS has `middleware.JWTAuth()` applied, regardless of dev mode
   - The quantum routes are registered on the protected `/api` group: `api.Get("/quantum/*",...)`
   - Both dev and production modes require a valid JWT token

2. **The Auth Middleware Doesn't Check Dev Mode** (middleware/auth.go:222-292):
   - It always validates the JWT token
   - No exception for dev mode users
   - The only dev-mode bypass is for WebSocket connections via `demo-token` (websocket.go:320), not HTTP requests

3. **The Real Problem**:
   - Even though you're logged in to the console (GitHub OAuth), the JWT cookie might NOT be getting sent correctly across ports 5174 → 8081
   - OR the browser's cookie is being rejected by the JWT validator for some reason

## Why the Cards Are Stuck in Demo Mode

The Quantum cards (QuantumControlPanel.tsx) make requests with `credentials: 'include'`, which should send the JWT cookie. But if the cookie isn't present or valid:

1. Request fails with "Missing authorization"  
2. Card catches the error and treats it as a network failure
3. After 3 consecutive failures → card falls back to demo data with yellow badge

## Solution Options

**Option A: Fix the cookie/auth issue** (recommended for production parity)
- Verify the JWT cookie is actually being set on the browser
- Check if there's a cross-port issue between 5174 (frontend) and 8081 (backend)
- Fix the root auth problem so real data works in both dev and production

**Option B: Bypass auth for Quantum endpoints in dev mode** (dev-only workaround)
- Modify the JWTAuth middleware to skip validation when `DevMode=true` AND the path is `/api/quantum/*`
- This would only affect development; production would still require auth
- Cards would show live data in dev mode only

Which approach would you prefer? Option A is better long-term since it works consistently. Option B is faster but only helps during development.

### claude-code (4/17/2026, 11:18:21 AM)

Perfect! Now I have the full picture. Let me summarize the findings:

## Analysis: Dev Mode vs Production Mode

**The behavior is THE SAME in both modes** — the Quantum cards show demo data in both because:

1. **JWT Auth is ALWAYS Required** (lines 676, 1067-1068):
   - The `/api` group ALWAYS has `middleware.JWTAuth()` applied, regardless of dev mode
   - The quantum routes are registered on the protected `/api` group: `api.Get("/quantum/*",...)`
   - Both dev and production modes require a valid JWT token

2. **The Auth Middleware Doesn't Check Dev Mode** (middleware/auth.go:222-292):
   - It always validates the JWT token
   - No exception for dev mode users
   - The only dev-mode bypass is for WebSocket connections via `demo-token` (websocket.go:320), not HTTP requests

3. **The Real Problem**:
   - Even though you're logged in to the console (GitHub OAuth), the JWT cookie might NOT be getting sent correctly across ports 5174 → 8081
   - OR the browser's cookie is being rejected by the JWT validator for some reason

## Why the Cards Are Stuck in Demo Mode

The Quantum cards (QuantumControlPanel.tsx) make requests with `credentials: 'include'`, which should send the JWT cookie. But if the cookie isn't present or valid:

1. Request fails with "Missing authorization"  
2. Card catches the error and treats it as a network failure
3. After 3 consecutive failures → card falls back to demo data with yellow badge

## Solution Options

**Option A: Fix the cookie/auth issue** (recommended for production parity)
- Verify the JWT cookie is actually being set on the browser
- Check if there's a cross-port issue between 5174 (frontend) and 8081 (backend)
- Fix the root auth problem so real data works in both dev and production

**Option B: Bypass auth for Quantum endpoints in dev mode** (dev-only workaround)
- Modify the JWTAuth middleware to skip validation when `DevMode=true` AND the path is `/api/quantum/*`
- This would only affect development; production would still require auth
- Cards would show live data in dev mode only

Which approach would you prefer? Option A is better long-term since it works consistently. Option B is faster but only helps during development.

### User (4/17/2026, 11:20:54 AM)

option A. Please do a test to confirm you can edit/write files before doing any significant changes

### claude-code (4/17/2026, 11:20:59 AM)

I'll test file editing/writing capabilities before making any significant changes. Let me create a test file and then edit it.I need permission to write files. Let me request that now - you should see a permission prompt asking to allow file writing.

### claude-code (4/17/2026, 11:21:02 AM)

I need permission to write files. Let me request that now - you should see a permission prompt asking to allow file writing.

### User (4/17/2026, 11:24:46 AM)

OK, due to limitations in how claude runs on this workstation, those prompts are not displayed to me. Please create a development plan that I can copy and paste into a file to use with the Claude CLI

### claude-code (4/17/2026, 11:24:51 AM)

I'll create a comprehensive development plan to fix the JWT auth/cookie issue so Quantum cards show live data in both dev and production modes.

### claude-code (4/17/2026, 11:25:30 AM)

Since file write permissions aren't automatically available, here's the plan as text that you can copy and paste:

---

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

---

**To use this plan with Claude CLI:**

1. Save the plan above to a file: `QUANTUM_AUTH_FIX_PLAN.md`
2. Run: `claude -m opus QUANTUM_AUTH_FIX_PLAN.md`

The plan covers:
- **Investigation phase** to diagnose the exact auth issue
- **Fix phase** to adjust cookie attributes and CORS
- **Test phase** in both dev and production modes
- **6 files** to review/modify
- **Success criteria** to validate the fix

This approach tests and verifies the issue before making changes, ensuring the fix works in both modes.

### claude-code (4/17/2026, 11:25:30 AM)

Since file write permissions aren't automatically available, here's the plan as text that you can copy and paste:

---

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

---

**To use this plan with Claude CLI:**

1. Save the plan above to a file: `QUANTUM_AUTH_FIX_PLAN.md`
2. Run: `claude -m opus QUANTUM_AUTH_FIX_PLAN.md`

The plan covers:
- **Investigation phase** to diagnose the exact auth issue
- **Fix phase** to adjust cookie attributes and CORS
- **Test phase** in both dev and production modes
- **6 files** to review/modify
- **Success criteria** to validate the fix

This approach tests and verifies the issue before making changes, ensuring the fix works in both modes.
