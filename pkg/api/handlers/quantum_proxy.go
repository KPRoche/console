package handlers

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	quantumProxyTimeout = 30 * time.Second
)

// quantumClient uses a shared HTTP client with timeout to prevent hanging requests
var quantumClient = &http.Client{
	Timeout: quantumProxyTimeout,
}

// Safe headers to forward from the client to the quantum service
// (excludes sensitive headers like Cookie, Authorization, etc.)
var safeHeadersToForward = map[string]bool{
	"Accept":           true,
	"Accept-Encoding":  true,
	"Accept-Language":  true,
	"User-Agent":       true,
	"Content-Type":     true,
	"X-Requested-With": true,
}

type QuantumProxyHandler struct {
	quantumServiceURL string
}

func NewQuantumProxyHandler() *QuantumProxyHandler {
	// Get service URL from env, default to localhost port-forward
	// The port-forward bridges kubectl to localhost:5000 in dev environments
	quantumURL := os.Getenv("QUANTUM_SERVICE_URL")
	if quantumURL == "" {
		quantumURL = "http://localhost:5000"
	}

	// Validate URL is not targeting private/internal IPs (SSRF protection)
	// This prevents accidentally or maliciously proxying to internal services
	if err := validateQuantumServiceURL(quantumURL); err != nil {
		slog.Error("[QuantumProxy] Invalid QUANTUM_SERVICE_URL", "error", err)
		// Return handler with default safe URL on validation failure
		quantumURL = "http://localhost:5000"
	}

	return &QuantumProxyHandler{
		quantumServiceURL: quantumURL,
	}
}

// validateQuantumServiceURL checks that the URL is valid and not targeting private/internal hosts.
// Exception: localhost and 127.0.0.1 are always allowed (dev environment port-forwards).
func validateQuantumServiceURL(quantumURL string) error {
	parsed, err := url.Parse(quantumURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("invalid scheme: must be http or https, got %q", parsed.Scheme)
	}

	host := parsed.Hostname()
	if host == "" {
		return fmt.Errorf("URL has no hostname")
	}

	// Allow localhost and 127.0.0.1 (safe for dev environment port-forwards)
	lower := strings.ToLower(host)
	if lower == "localhost" || lower == "127.0.0.1" || lower == "::1" {
		return nil
	}

	// Block other private/internal IPs to prevent SSRF
	if IsPrivateHost(host) {
		return fmt.Errorf("QUANTUM_SERVICE_URL targets private/internal host: %q", host)
	}

	return nil
}

// ProxyRequest handles GET requests to quantum endpoints
func (h *QuantumProxyHandler) ProxyRequest(c *fiber.Ctx) error {
	endpoint := c.Params("*")
	// Prepend /api/ to the endpoint path to match quantum backend API structure
	targetURL := h.quantumServiceURL + "/api/" + endpoint

	// Forward query parameters
	if queryStr := c.Request().URI().QueryArgs().String(); queryStr != "" {
		targetURL += "?" + queryStr
	}

	slog.Debug("[QuantumProxy] Forwarding request", "from", c.Path(), "to", targetURL)

	// Create HTTP client request
	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Forward only safe headers (exclude sensitive headers like Cookie, Authorization)
	c.Request().Header.VisitAll(func(key, value []byte) {
		keyStr := string(key)
		if safeHeadersToForward[keyStr] {
			req.Header.Add(keyStr, string(value))
		}
	})

	// Execute request with shared client (has timeout)
	resp, err := quantumClient.Do(req)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, fmt.Sprintf("Quantum service unavailable: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read response")
	}

	slog.Debug("[QuantumProxy] Response received", "status", resp.StatusCode, "content_type", resp.Header.Get("Content-Type"), "body_size", len(body))

	// Set response headers and status
	c.Status(resp.StatusCode)
	c.Set("Content-Type", resp.Header.Get("Content-Type"))

	return c.Send(body)
}

// ProxyResultHistogram handles GET requests to /api/result/histogram
func (h *QuantumProxyHandler) ProxyResultHistogram(c *fiber.Ctx) error {
	sort := c.Query("sort", "count")
	targetURL := h.quantumServiceURL + "/api/result/histogram?sort=" + sort

	slog.Debug("[QuantumProxy] Forwarding histogram request", "from", c.Path(), "to", targetURL)

	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Forward only safe headers (exclude sensitive headers like Cookie, Authorization)
	c.Request().Header.VisitAll(func(key, value []byte) {
		keyStr := string(key)
		if safeHeadersToForward[keyStr] {
			req.Header.Add(keyStr, string(value))
		}
	})

	// Execute request with shared client (has timeout)
	resp, err := quantumClient.Do(req)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, fmt.Sprintf("Quantum service unavailable: %v", err))
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read response")
	}

	slog.Debug("[QuantumProxy] Histogram response received", "status", resp.StatusCode, "content_type", resp.Header.Get("Content-Type"), "body_size", len(body))

	c.Status(resp.StatusCode)
	c.Set("Content-Type", resp.Header.Get("Content-Type"))

	return c.Send(body)
}

// ProxyPostRequest handles POST requests to quantum endpoints
func (h *QuantumProxyHandler) ProxyPostRequest(c *fiber.Ctx) error {
	endpoint := c.Params("*")
	// Prepend /api/ to the endpoint path to match quantum backend API structure
	targetURL := h.quantumServiceURL + "/api/" + endpoint

	// Forward query parameters
	if queryStr := c.Request().URI().QueryArgs().String(); queryStr != "" {
		targetURL += "?" + queryStr
	}

	slog.Debug("[QuantumProxy] Forwarding POST request", "from", c.Path(), "to", targetURL)

	// Create HTTP client request
	req, err := http.NewRequest(http.MethodPost, targetURL, strings.NewReader(string(c.Body())))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Forward only safe headers (exclude sensitive headers like Cookie, Authorization)
	c.Request().Header.VisitAll(func(key, value []byte) {
		keyStr := string(key)
		if safeHeadersToForward[keyStr] {
			req.Header.Add(keyStr, string(value))
		}
	})

	// Execute request with shared client (has timeout)
	resp, err := quantumClient.Do(req)
	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, fmt.Sprintf("Quantum service unavailable: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read response")
	}

	slog.Debug("[QuantumProxy] Response received", "status", resp.StatusCode, "content_type", resp.Header.Get("Content-Type"), "body_size", len(body))

	// Set response headers and status
	c.Status(resp.StatusCode)
	c.Set("Content-Type", resp.Header.Get("Content-Type"))

	return c.Send(body)
}
