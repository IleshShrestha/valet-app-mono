package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"valet-backend-go/internal/api"
	"valet-backend-go/internal/auth"
)

func corsApp(origins []string) *api.Application {
	tm := auth.NewTokenManager(testJWTSecret, 15, 30)
	return api.New(api.Config{Env: "test", AllowedOrigins: origins}, emptyRepo(), tm)
}

func TestCORSReflectsAllowedOrigin(t *testing.T) {
	app := corsApp([]string{"http://localhost:5173"})

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("want Access-Control-Allow-Origin=http://localhost:5173, got %q", got)
	}
}

func TestCORSPreflightSucceeds(t *testing.T) {
	app := corsApp([]string{"http://localhost:5173"})

	req := httptest.NewRequest(http.MethodOptions, "/v1/service-days", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Authorization,Content-Type")
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 200/204", rr.Code)
	}
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("preflight allow-origin = %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Fatal("preflight missing Access-Control-Allow-Methods")
	}
}

func TestCORSDisallowedOriginNotReflected(t *testing.T) {
	app := corsApp([]string{"http://localhost:5173"})

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	req.Header.Set("Origin", "http://evil.example.com")
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got == "http://evil.example.com" {
		t.Fatal("disallowed origin should not be reflected in Access-Control-Allow-Origin")
	}
}
