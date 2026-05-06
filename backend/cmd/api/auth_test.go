package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"valet-backend-go/internal/auth"
)

func TestAccessTokenValidation(t *testing.T) {
	tm := auth.NewTokenManager("secret", 15, 30)
	tok, err := tm.GenerateAccessToken(1, "user@example.com", "admin")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := tm.ValidateAccessToken(tok)
	if err != nil || claims.UserID != 1 {
		t.Fatal("invalid token claims")
	}
}

func TestHashRefreshTokenConsistency(t *testing.T) {
	if auth.HashRefreshToken("abc") != auth.HashRefreshToken("abc") {
		t.Fatal("expected deterministic hash")
	}
}

func TestRequireAuthRejectsMissingHeader(t *testing.T) {
	app := &application{tokenManager: auth.NewTokenManager("secret", 15, 30)}
	h := app.requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", rr.Code)
	}
}
