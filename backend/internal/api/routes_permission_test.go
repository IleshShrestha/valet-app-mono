package api_test

import (
	"net/http"
	"testing"
)

// access encodes the authorization level a route is expected to enforce.
type access int

const (
	accessPublic access = iota // no auth required
	accessAuth                 // any authenticated user
	accessAdmin                // admin role only
)

type routeCase struct {
	name   string
	method string
	target string
	access access
}

// routeMatrix mirrors the routing table in api.go. Keep it in sync when routes change
var routeMatrix = []routeCase{
	{"health", http.MethodGet, "/v1/health", accessPublic},
	{"login", http.MethodPost, "/v1/auth/login", accessPublic},
	{"refresh", http.MethodPost, "/v1/auth/refresh", accessPublic},
	{"logout", http.MethodPost, "/v1/auth/logout", accessPublic},

	{"logout-all", http.MethodPost, "/v1/auth/logout-all", accessAuth},
	{"me", http.MethodGet, "/v1/auth/me", accessAuth},

	{"list users", http.MethodGet, "/v1/users/", accessAuth},
	{"get user", http.MethodGet, "/v1/users/1", accessAuth},
	{"create user", http.MethodPost, "/v1/users/", accessAdmin},
	{"update user", http.MethodPut, "/v1/users/1", accessAdmin},
	{"delete user", http.MethodDelete, "/v1/users/1", accessAdmin},

	{"list service-days", http.MethodGet, "/v1/service-days", accessAuth},
	{"check location", http.MethodPost, "/v1/service-days/check-location", accessAuth},
	{"get service-day", http.MethodGet, "/v1/service-days/1", accessAuth},
	{"create service-day", http.MethodPost, "/v1/service-days", accessAdmin},
	{"update service-day", http.MethodPut, "/v1/service-days/1", accessAdmin},
	{"delete service-day", http.MethodDelete, "/v1/service-days/1", accessAdmin},
	{"service-day status", http.MethodPut, "/v1/service-days/1/status", accessAdmin},
	{"review service-days", http.MethodGet, "/v1/service-days/review", accessAdmin},

	{"list locations", http.MethodGet, "/v1/locations", accessAdmin},
	{"location summaries", http.MethodGet, "/v1/locations/summaries", accessAuth},
	{"create location", http.MethodPost, "/v1/locations/", accessAdmin},
	{"update location", http.MethodPut, "/v1/locations/1", accessAdmin},

	{"invoice service-days", http.MethodGet, "/v1/invoices/service-days", accessAdmin},
	{"invoice preview", http.MethodPost, "/v1/invoices/preview", accessAdmin},
}

// Unauthenticated requests must be rejected on every protected route, and
// allowed through on public ones.
func TestRoutes_Unauthenticated(t *testing.T) {
	for _, rc := range routeMatrix {
		t.Run(rc.name, func(t *testing.T) {
			app, _ := newTestApp(emptyRepo())
			rr := doRequest(t, app, rc.method, rc.target, "", "")

			if rc.access == accessPublic {
				if rr.Code == http.StatusUnauthorized {
					t.Fatalf("public route %s returned 401 without auth", rc.target)
				}
				return
			}
			if rr.Code != http.StatusUnauthorized {
				t.Fatalf("protected route %s returned %d without auth, want 401", rc.target, rr.Code)
			}
		})
	}
}

// A non-admin authenticated user must be forbidden from admin-only routes and
// admitted (past the auth layer) on auth-level routes.
func TestRoutes_NonAdminAuthenticated(t *testing.T) {
	for _, rc := range routeMatrix {
		if rc.access == accessPublic {
			continue
		}
		t.Run(rc.name, func(t *testing.T) {
			app, tm := newTestApp(emptyRepo())
			token := mintToken(t, tm, "employee", 1)
			rr := doRequest(t, app, rc.method, rc.target, token, "")

			switch rc.access {
			case accessAdmin:
				if rr.Code != http.StatusForbidden {
					t.Fatalf("admin route %s returned %d for employee, want 403", rc.target, rr.Code)
				}
			case accessAuth:
				if rr.Code == http.StatusUnauthorized || rr.Code == http.StatusForbidden {
					t.Fatalf("auth route %s rejected an authenticated user with %d", rc.target, rr.Code)
				}
			}
		})
	}
}

// An admin must pass the authorization layer on every route (may still get
// 400/404 from handler logic, but never 401/403).
func TestRoutes_AdminAuthenticated(t *testing.T) {
	for _, rc := range routeMatrix {
		if rc.access == accessPublic {
			continue
		}
		t.Run(rc.name, func(t *testing.T) {
			app, tm := newTestApp(emptyRepo())
			token := mintToken(t, tm, "admin", 1)
			rr := doRequest(t, app, rc.method, rc.target, token, "")

			if rr.Code == http.StatusUnauthorized || rr.Code == http.StatusForbidden {
				t.Fatalf("route %s rejected admin with %d", rc.target, rr.Code)
			}
		})
	}
}
