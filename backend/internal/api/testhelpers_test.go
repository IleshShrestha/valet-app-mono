package api_test

import (
	"context"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"valet-backend-go/internal/api"
	"valet-backend-go/internal/auth"
	"valet-backend-go/internal/repository"
)

const (
	testOrgID     = "00000000-0000-0000-0000-000000000001"
	testJWTSecret = "test-secret"
)

// --- Fake repositories ---------------------------------------------------
// Minimal in-memory fakes implementing the repository interfaces so the HTTP
// layer can be driven end-to-end (router + middleware + handlers) without a DB.

type fakeShiftRepo struct {
	all            []*repository.Shift
	assigned       []*repository.Shift
	byID           *repository.Shift
	assignedUserID int64
	getAllCalled   bool
}

func (f *fakeShiftRepo) Create(ctx context.Context, shift *repository.Shift) error { return nil }
func (f *fakeShiftRepo) GetAll(ctx context.Context, organizationID string) ([]*repository.Shift, error) {
	f.getAllCalled = true
	return f.all, nil
}
func (f *fakeShiftRepo) GetAllByAssignedUser(ctx context.Context, userID int64, organizationID string) ([]*repository.Shift, error) {
	f.assignedUserID = userID
	return f.assigned, nil
}
func (f *fakeShiftRepo) GetByID(ctx context.Context, id int64, organizationID string) (*repository.Shift, error) {
	if f.byID == nil {
		return nil, repository.ErrNotFound
	}
	return f.byID, nil
}
func (f *fakeShiftRepo) Update(ctx context.Context, shift *repository.Shift) error { return nil }
func (f *fakeShiftRepo) Delete(ctx context.Context, id int64, organizationID string) error {
	return nil
}

type fakeUserRepo struct {
	getByID    *repository.User
	getByEmail *repository.User
	all        []*repository.User
}

func (f *fakeUserRepo) Create(ctx context.Context, user *repository.User) error { return nil }
func (f *fakeUserRepo) GetById(ctx context.Context, id int64, organizationID string) (*repository.User, error) {
	if f.getByID == nil {
		return nil, repository.ErrNotFound
	}
	return f.getByID, nil
}
func (f *fakeUserRepo) GetAll(ctx context.Context, organizationID string) ([]*repository.User, error) {
	return f.all, nil
}
func (f *fakeUserRepo) Update(ctx context.Context, id int64, organizationID, role, firstName, lastName, email string, password *string) error {
	return nil
}
func (f *fakeUserRepo) Delete(ctx context.Context, id int64, organizationID string) error { return nil }
func (f *fakeUserRepo) GetByEmailWithPassword(ctx context.Context, email string) (*repository.User, error) {
	if f.getByEmail == nil {
		return nil, repository.ErrNotFound
	}
	return f.getByEmail, nil
}

type fakeLocationRepo struct {
	byID      *repository.Location
	summaries []repository.LocationSummary
}

func (f *fakeLocationRepo) GetByID(ctx context.Context, id int64, organizationID string) (*repository.Location, error) {
	if f.byID == nil {
		return nil, repository.ErrNotFound
	}
	return f.byID, nil
}
func (f *fakeLocationRepo) ListSummaries(ctx context.Context, organizationID string) ([]repository.LocationSummary, error) {
	return f.summaries, nil
}
func (f *fakeLocationRepo) Create(ctx context.Context, loc *repository.Location) error { return nil }

type fakeRefreshTokenRepo struct{}

func (f *fakeRefreshTokenRepo) CreateRefreshToken(ctx context.Context, userID int64, tokenHash, platform, deviceName, userAgent, ipAddress string, expiresAt time.Time) error {
	return nil
}
func (f *fakeRefreshTokenRepo) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*repository.RefreshToken, error) {
	return nil, repository.ErrNotFound
}
func (f *fakeRefreshTokenRepo) MarkRefreshTokenUsed(ctx context.Context, tokenHash string) error {
	return nil
}
func (f *fakeRefreshTokenRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	return nil
}
func (f *fakeRefreshTokenRepo) RevokeAllRefreshTokensForUser(ctx context.Context, userID int64) error {
	return nil
}
func (f *fakeRefreshTokenRepo) DeleteExpiredRefreshTokens(ctx context.Context) error { return nil }

// emptyRepo returns a Repository backed by no-op fakes. Tests override the
// specific sub-repository they exercise.
func emptyRepo() repository.Repository {
	return repository.Repository{
		Users:         &fakeUserRepo{},
		Shifts:        &fakeShiftRepo{},
		Locations:     &fakeLocationRepo{},
		RefreshTokens: &fakeRefreshTokenRepo{},
	}
}

// --- Test app + request helpers -----------------------------------------

func newTestApp(repo repository.Repository) (*api.Application, *auth.TokenManager) {
	tm := auth.NewTokenManager(testJWTSecret, 15, 30)
	app := api.New(api.Config{Addr: ":0", Env: "test"}, repo, tm)
	return app, tm
}

func mintToken(t *testing.T, tm *auth.TokenManager, role string, userID int64) string {
	t.Helper()
	tok, err := tm.GenerateAccessToken(userID, testOrgID, "user@example.com", role)
	if err != nil {
		t.Fatalf("mint token: %v", err)
	}
	return tok
}

// doRequest drives a request through the real router (middleware included).
// Pass an empty token to send no Authorization header.
func doRequest(t *testing.T, app *api.Application, method, target, token, body string) *httptest.ResponseRecorder {
	t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, target, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	return rr
}
