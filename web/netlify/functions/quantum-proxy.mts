import type { Context } from "@netlify/functions";

// isPrivateIP checks if an IP address is private/internal (SSRF prevention)
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./, // Link-local
  ];
  return privateRanges.some(range => range.test(ip));
}

// isPrivateHost checks if a hostname is private/internal
// Exception: localhost and 127.0.0.1 are allowed (dev environment port-forwards)
function isPrivateHost(host: string): boolean {
  const lower = host.toLowerCase();

  // Allow localhost and loopback (safe for dev environment port-forwards)
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return false;
  }

  // Block well-known internal hostnames
  if (lower === "metadata.google.internal" ||
      lower.endsWith(".internal") ||
      lower.endsWith(".local") ||
      lower.endsWith(".cluster.local") ||
      lower.endsWith(".svc.cluster.local")) {
    return true;
  }

  // Check if it's a private IP
  if (isPrivateIP(host)) {
    return true;
  }

  return false;
}

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

const DEMO_CIRCUIT_ASCII_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Circuit Diagram</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        pre { background: white; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <pre>     ┌───┐ ░ ┌─┐
q_0: ┤ H ├─░─┤M├─────────
     ├───┤ ░ └╥┘┌─┐
q_1: ┤ H ├─░──╫─┤M├──────
     ├───┤ ░  ║ └╥┘┌─┐
q_2: ┤ H ├─░──╫──╫─┤M├───
     ├───┤ ░  ║  ║ └╥┘┌─┐
q_3: ┤ H ├─░──╫──╫──╫─┤M├
     ├───┤ ░  ║  ║  ║ └╥┘
q_4: ┤ H ├─░──╫──╫──╫──╫─
     └───┘ ░  ║  ║  ║  ║
c: 5/═════════╩══╩══╩══╩═
              0  1  2  3 </pre>
</body>
</html>`;

export default async (req: Request, context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/.netlify/functions/quantum-proxy", "");

  // Determine if we have a real quantum service
  let quantumServiceURL =
    context.env.QUANTUM_SERVICE_URL ||
    "http://quantum-kc-demo.quantum.svc.cluster.local:5000";
  const isDemo = !context.env.QUANTUM_SERVICE_URL;

  // Validate QUANTUM_SERVICE_URL is not targeting private/internal hosts (SSRF protection)
  if (!isDemo && context.env.QUANTUM_SERVICE_URL) {
    try {
      const parsedURL = new URL(context.env.QUANTUM_SERVICE_URL);
      const hostname = parsedURL.hostname;
      if (isPrivateHost(hostname)) {
        console.error(
          `[quantum-proxy] QUANTUM_SERVICE_URL targets private host: ${hostname}`
        );
        // Fall back to demo mode on validation failure
        quantumServiceURL = "http://quantum-kc-demo.quantum.svc.cluster.local:5000";
      }
    } catch (err) {
      console.error(
        `[quantum-proxy] Invalid QUANTUM_SERVICE_URL: ${err}`
      );
      // Fall back to demo mode on parse failure
      quantumServiceURL = "http://quantum-kc-demo.quantum.svc.cluster.local:5000";
    }
  }

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
      if (path === "/qasm/circuit/ascii") {
        return new Response(DEMO_CIRCUIT_ASCII_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html" },
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
