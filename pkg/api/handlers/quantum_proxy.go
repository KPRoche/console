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

	// Copy headers from Fiber request to HTTP request
	c.Request().Header.VisitAll(func(key, value []byte) {
		req.Header.Add(string(key), string(value))
	})

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

	// Copy headers from Fiber request to HTTP request
	c.Request().Header.VisitAll(func(key, value []byte) {
		req.Header.Add(string(key), string(value))
	})

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
