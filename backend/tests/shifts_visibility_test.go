package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
)

type fakeShiftRepository struct {
	all            []*repository.Shift
	assigned       []*repository.Shift
	byID           *repository.Shift
	assignedUserID int64
	getAllCalled   bool
}

func (f *fakeShiftRepository) Create(ctx context.Context, shift *repository.Shift) error {
	return nil
}

func (f *fakeShiftRepository) GetAll(ctx context.Context) ([]*repository.Shift, error) {
	f.getAllCalled = true
	return f.all, nil
}

func (f *fakeShiftRepository) GetAllByAssignedUser(ctx context.Context, userID int64) ([]*repository.Shift, error) {
	f.assignedUserID = userID
	return f.assigned, nil
}

func (f *fakeShiftRepository) GetByID(ctx context.Context, id int64) (*repository.Shift, error) {
	if f.byID == nil {
		return nil, repository.ErrNotFound
	}
	return f.byID, nil
}

func (f *fakeShiftRepository) Update(ctx context.Context, shift *repository.Shift) error {
	return nil
}

func (f *fakeShiftRepository) Delete(ctx context.Context, id int64) error {
	return nil
}

func requestWithAuthUser(role string, userID int64) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/v1/shifts", nil)
	ctx := context.WithValue(req.Context(), authUserKey, authCtxUser{
		UserID: userID,
		Role:   role,
	})
	return req.WithContext(ctx)
}

func shiftDetailRequestWithAuthUser(role string, userID int64, shiftID string) *http.Request {
	req := requestWithAuthUser(role, userID)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("shiftId", shiftID)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
}

func TestGetAllShiftsReturnsOnlyAssignedShiftsForWorker(t *testing.T) {
	shiftRepo := &fakeShiftRepository{
		assigned: []*repository.Shift{
			{ID: 2, Title: "Assigned", AssignedUsers: []repository.AssignedUser{{ID: 42}}},
		},
	}
	app := &application{repository: repository.Repository{Shifts: shiftRepo}}

	rr := httptest.NewRecorder()
	app.getAllShiftsHandler(rr, requestWithAuthUser("employee", 42))

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	if shiftRepo.assignedUserID != 42 {
		t.Fatalf("expected assigned query for user 42, got %d", shiftRepo.assignedUserID)
	}
	if shiftRepo.getAllCalled {
		t.Fatal("worker should not use all-shifts query")
	}

	var body struct {
		Data []repository.Shift `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(body.Data) != 1 || body.Data[0].ID != 2 {
		t.Fatalf("expected one assigned shift, got %#v", body.Data)
	}
}

func TestGetAllShiftsReturnsAllShiftsForManager(t *testing.T) {
	shiftRepo := &fakeShiftRepository{
		all: []*repository.Shift{
			{ID: 1, Title: "Open"},
			{ID: 2, Title: "Assigned"},
		},
	}
	app := &application{repository: repository.Repository{Shifts: shiftRepo}}

	rr := httptest.NewRecorder()
	app.getAllShiftsHandler(rr, requestWithAuthUser("manager", 42))

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	if !shiftRepo.getAllCalled {
		t.Fatal("manager should use all-shifts query")
	}
	if shiftRepo.assignedUserID != 0 {
		t.Fatalf("manager should not use assigned query, got user %d", shiftRepo.assignedUserID)
	}
}

func TestGetShiftRejectsWorkerWhenShiftIsNotAssigned(t *testing.T) {
	shiftRepo := &fakeShiftRepository{
		byID: &repository.Shift{
			ID:            7,
			Title:         "Other Shift",
			AssignedUsers: []repository.AssignedUser{{ID: 99}},
		},
	}
	app := &application{repository: repository.Repository{Shifts: shiftRepo}}

	req := shiftDetailRequestWithAuthUser("employee", 42, "7")
	rr := httptest.NewRecorder()
	app.getShiftHandler(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d", rr.Code)
	}
}
