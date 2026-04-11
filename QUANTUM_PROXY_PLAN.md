# Quantum API Proxy Implementation Plan

## Overview

Currently, the Quantum Control Panel and Quantum Qubit Grid cards hardcode `http://localhost:5000` and require a manual port-forward to the quantum-kc-demo pod. This plan removes that requirement by proxying quantum API requests through the console's existing backend infrastructure.

### Current Flow (❌ Requires port-forward)


Perfect! Here's the complete plan text you can copy and create as QUANTUM_PROXY_PLAN.md:


# Quantum API Proxy Implementation Plan

## Overview

Currently, the Quantum Control Panel and Quantum Qubit Grid cards hardcode `http://localhost:5000` and require a manual port-forward to the quantum-kc-demo pod. This plan removes that requirement by proxying quantum API requests through the console's existing backend infrastructure.

### Current Flow (❌ Requires port-forward)
Browser → localhost:5000 (port-forward) → quantum-kc-demo pod (Flask)


### New Flow (✅ No port-forward needed)
Browser → console backend (/api/quantum/*) → quantum-kc-demo service (cluster DNS)


---

## Implementation Steps

### Step 1: Create Go Proxy Handler

**File:** `pkg/api/handlers/quantum_proxy.go` (NEW)

```go
package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type QuantumProxyHandler struct {
	quantumServiceURL string
}

func NewQuantumProxyHandler() *QuantumProxyHandler {
	// Get service URL from env, default to in-cluster DNS
	url := os.Getenv("QUANTUM_SERVICE_URL")
	if url == "" {
		url = "http://quantum-kc-demo.quantum.svc.cluster.local:5000"
	}
	return &QuantumProxyHandler{
		quantumServiceURL: url,
	}
}

// ProxyRequest handles GET requests to quantum endpoints
func (h *QuantumProxyHandler) ProxyRequest(c *fiber.Ctx) error {
	endpoint := c.Params("*")
	targetURL := h.quantumServiceURL + "/" + endpoint

	// Forward query parameters
	if queryStr := c.Request().URI().QueryArgs().String(); queryStr != "" {
		targetURL += "?" + queryStr
	}

	// Create HTTP client request
	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Copy headers
	for key, values := range c.Request().Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, fmt.Sprintf("Quantum service unavailable: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read response")
	}

	// Set response headers and status
	c.Status(resp.StatusCode)
	c.Set("Content-Type", resp.Header.Get("Content-Type"))

	return c.Send(body)
}

// ProxyPostRequest handles POST requests to quantum endpoints
func (h *QuantumProxyHandler) ProxyPostRequest(c *fiber.Ctx) error {
	endpoint := c.Params("*")
	targetURL := h.quantumServiceURL + "/" + endpoint

	// Create HTTP client request
	req, err := http.NewRequest(http.MethodPost, targetURL, strings.NewReader(string(c.Body())))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Copy headers
	for key, values := range c.Request().Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, fmt.Sprintf("Quantum service unavailable: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read response")
	}

	// Set response headers and status
	c.Status(resp.StatusCode)
	c.Set("Content-Type", resp.Header.Get("Content-Type"))

	return c.Send(body)
}
Step 2: Register Routes in Server
File: pkg/api/server.go

Find the setupRoutes function and add these lines after other API routes:


	// Quantum API proxy
	quantumHandler := handlers.NewQuantumProxyHandler()
	api.Get("/quantum/*", quantumHandler.ProxyRequest)
	api.Post("/quantum/*", quantumHandler.ProxyPostRequest)
Step 3: Create Netlify Function for Quantum Proxy
File: web/netlify/functions/quantum-proxy.mts (NEW)


import type { Context } from "@netlify/functions";

// Demo data responses
const DEMO_STATUS = {
  status: "ready",
  backend: "Aer Simulator",
  version: "1.0.0",
  circuits_executed: 42,
};

const DEMO_QUBITS_SIMPLE = {
  qubits: [0, 1, 2, 3, 4],
  native_gates: ["u", "cx"],
};

const DEMO_EXECUTE_RESPONSE = {
  job_id: "demo-job-123",
  status: "completed",
  result: {
    counts: {
      "000": 512,
      "111": 512,
    },
  },
};

const DEMO_LOOP_RESPONSE = {
  status: "started",
  loop_id: "demo-loop-456",
};

export default async (req: Request, context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/.netlify/functions/quantum-proxy", "");

  // Determine if we have a real quantum service
  const quantumServiceURL =
    context.env.QUANTUM_SERVICE_URL ||
    "http://quantum-kc-demo.quantum.svc.cluster.local:5000";
  const isDemo = !context.env.QUANTUM_SERVICE_URL;

  try {
    if (isDemo) {
      // Return demo data for demo mode
      if (path === "/status") {
        return new Response(JSON.stringify(DEMO_STATUS), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/qubits/simple") {
        return new Response(JSON.stringify(DEMO_QUBITS_SIMPLE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/execute") {
        return new Response(JSON.stringify(DEMO_EXECUTE_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/loop/start") {
        return new Response(JSON.stringify(DEMO_LOOP_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/loop/stop") {
        return new Response(JSON.stringify({ status: "stopped" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Proxy to actual quantum service
    const targetURL = quantumServiceURL + path;
    const proxyReq = new Request(targetURL, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" ? undefined : await req.text(),
    });

    const response = await fetch(proxyReq);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Quantum proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Quantum service unavailable" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
Step 4: Update netlify.toml
File: netlify.toml

Add this redirect section (find the existing redirects section or add a new one):


[[redirects]]
from = "/api/quantum/*"
to = "/.netlify/functions/quantum-proxy"
status = 200
Step 5: Update MSW Handlers
File: web/src/mocks/handlers.ts

Add these handlers to the handlers array:


  // Quantum API endpoints
  http.get("/api/quantum/status", () => {
    return HttpResponse.json({
      status: "ready",
      backend: "Aer Simulator",
      version: "1.0.0",
      circuits_executed: 42,
    });
  }),

  http.get("/api/quantum/qubits/simple", () => {
    return HttpResponse.json({
      qubits: [0, 1, 2, 3, 4],
      native_gates: ["u", "cx"],
    });
  }),

  http.post("/api/quantum/execute", () => {
    return HttpResponse.json({
      job_id: "demo-job-123",
      status: "completed",
      result: {
        counts: {
          "000": 512,
          "111": 512,
        },
      },
    });
  }),

  http.post("/api/quantum/loop/start", () => {
    return HttpResponse.json({
      status: "started",
      loop_id: "demo-loop-456",
    });
  }),

  http.post("/api/quantum/loop/stop", () => {
    return HttpResponse.json({
      status: "stopped",
    });
  }),
Step 6: Update QuantumControlPanel.tsx
File: web/src/components/cards/QuantumControlPanel.tsx

Replace all instances of http://localhost:5000 with /api/quantum:

Line ~108: const response = await fetch('http://localhost:5000/status')
→ const response = await fetch('/api/quantum/status')

Line ~170: const executeResponse = await fetch('http://localhost:5000/execute', ...)
→ const executeResponse = await fetch('/api/quantum/execute', ...)

Line ~223: const loopResponse = await fetch('http://localhost:5000/loop/start', ...)
→ const loopResponse = await fetch('/api/quantum/loop/start', ...)

Line ~232: const stopResponse = await fetch('http://localhost:5000/loop/stop', ...)
→ const stopResponse = await fetch('/api/quantum/loop/stop', ...)

Step 7: Update QuantumQubitGrid.tsx
File: web/src/components/cards/QuantumQubitGrid.tsx

Replace all instances of http://localhost:5000 with /api/quantum:

Line ~TBD: const response = await fetch('http://localhost:5000/qubits/simple'...)
→ const response = await fetch('/api/quantum/qubits/simple'...)

Any other localhost:5000 references → /api/quantum

Environment Variables
For Local Development
No changes needed - the Go backend will use the default in-cluster DNS name: http://quantum-kc-demo.quantum.svc.cluster.local:5000

For Docker/Kubernetes Deployment
Set the environment variable in the container/pod:


QUANTUM_SERVICE_URL=http://quantum-kc-demo.quantum.svc.cluster.local:5000
For Netlify Deployment
Set via Netlify environment variables in the deploy settings:

QUANTUM_SERVICE_URL=<production-quantum-service-url>
Testing Checklist
 Local dev with port-forward to quantum-kc-demo pod is running


kubectl port-forward -n quantum svc/quantum-kc-demo 5000:5000
./startup-oauth.sh
 Backend starts without errors:


cd /home/kproche/new-console/console
go run ./cmd/console/main.go
 Frontend builds without errors:


cd web && npm run build
 QuantumControlPanel card loads

Navigate to dashboard with quantum card
Check browser console for errors
Status should display (either real or demo data)
 QuantumQubitGrid card loads

Verify grid renders
Qubit count matches backend response
 Execute circuit works

Enter a valid circuit
Click "Execute"
Results should appear (or demo data in fallback mode)
 Loop mode works

Start loop mode
Status updates periodically
Stop button works
 No localhost:5000 references in network tab

Open DevTools Network tab
Filter to /api/quantum requests
Verify no direct localhost:5000 calls
 Demo mode works (no port-forward)

Stop the quantum pod port-forward
Refresh browser
Cards should show demo data with Demo badge
Summary of Changes
File	Change	Type
pkg/api/handlers/quantum_proxy.go	New proxy handler	CREATE
pkg/api/server.go	Register quantum routes	MODIFY
web/netlify/functions/quantum-proxy.mts	Netlify proxy function	CREATE
netlify.toml	Add quantum redirect	MODIFY
web/src/mocks/handlers.ts	Add MSW handlers	MODIFY
web/src/components/cards/QuantumControlPanel.tsx	Replace hardcoded URLs	MODIFY
web/src/components/cards/QuantumQubitGrid.tsx	Replace hardcoded URLs	MODIFY
Rollback Plan
If something breaks:

Revert the card changes (Steps 6-7) to use http://localhost:5000 again
Keep the port-forward running as a temporary fallback
Debug the proxy handler logs
Re-test once fixed
Notes
The quantum-kc-demo pod does NOT need any changes
The service must be named quantum-kc-demo and in the quantum namespace
The Go backend will use in-cluster DNS to reach it
Frontend will call /api/quantum/* endpoints (proxied by Go or Netlify)
No browser-level port-forwards needed after this change

Copy this entire text and create the file `QUANTUM_PROXY_PLAN.md` in the console directory. Then you'll have the complete implementation guide ready to go!
4:44:22 PM