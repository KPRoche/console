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
