package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"valet-backend-go/internal/repository"
)

// These drive the full router with real JWTs so visibility rules are verified
// through the actual requireAuth middleware + handler logic.

func TestWorkerSeesOnlyAssignedShifts(t *testing.T) {
	shiftRepo := &fakeShiftRepo{
		assigned: []*repository.Shift{
			{ID: 2, Title: "Assigned", AssignedUsers: []repository.AssignedUser{{ID: 42}}},
		},
	}
	repo := emptyRepo()
	repo.Shifts = shiftRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/shifts", mintToken(t, tm, "employee", 42), "")

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

func TestManagerSeesAllShifts(t *testing.T) {
	shiftRepo := &fakeShiftRepo{
		all: []*repository.Shift{{ID: 1, Title: "Open"}, {ID: 2, Title: "Assigned"}},
	}
	repo := emptyRepo()
	repo.Shifts = shiftRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/shifts", mintToken(t, tm, "manager", 42), "")

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

func TestWorkerForbiddenOnUnassignedShiftDetail(t *testing.T) {
	shiftRepo := &fakeShiftRepo{
		byID: &repository.Shift{ID: 7, Title: "Other", AssignedUsers: []repository.AssignedUser{{ID: 99}}},
	}
	repo := emptyRepo()
	repo.Shifts = shiftRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/shifts/7", mintToken(t, tm, "employee", 42), "")

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d", rr.Code)
	}
}

func TestWorkerSeesAssignedShiftDetail(t *testing.T) {
	shiftRepo := &fakeShiftRepo{
		byID: &repository.Shift{ID: 7, Title: "Mine", AssignedUsers: []repository.AssignedUser{{ID: 42}}},
	}
	repo := emptyRepo()
	repo.Shifts = shiftRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/shifts/7", mintToken(t, tm, "employee", 42), "")

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
}
