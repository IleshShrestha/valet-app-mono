package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"valet-backend-go/internal/repository"
)

// dayWithWorker builds a service day whose single segment is assigned to userID.
func dayWithWorker(id int64, userID int64) *repository.ServiceDay {
	return &repository.ServiceDay{
		ID:    id,
		Title: "Day",
		Segments: []repository.Segment{
			{ID: id * 10, Name: "morning", AssignedUsers: []repository.AssignedUser{{ID: userID}}},
		},
	}
}

func TestWorkerSeesOnlyAssignedServiceDays(t *testing.T) {
	dayRepo := &fakeServiceDayRepo{assigned: []*repository.ServiceDay{dayWithWorker(2, 42)}}
	repo := emptyRepo()
	repo.ServiceDays = dayRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/service-days", mintToken(t, tm, "employee", 42), "")

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	if dayRepo.assignedUserID != 42 {
		t.Fatalf("expected assigned query for user 42, got %d", dayRepo.assignedUserID)
	}
	if dayRepo.getAllCalled {
		t.Fatal("worker should not use the all-days query")
	}

	var body struct {
		Data []repository.ServiceDay `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(body.Data) != 1 || body.Data[0].ID != 2 {
		t.Fatalf("expected one assigned day, got %#v", body.Data)
	}
}

func TestManagerSeesAllServiceDays(t *testing.T) {
	dayRepo := &fakeServiceDayRepo{all: []*repository.ServiceDay{{ID: 1}, {ID: 2}}}
	repo := emptyRepo()
	repo.ServiceDays = dayRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/service-days", mintToken(t, tm, "manager", 42), "")

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	if !dayRepo.getAllCalled {
		t.Fatal("manager should use the all-days query")
	}
	if dayRepo.assignedUserID != 0 {
		t.Fatalf("manager should not use the assigned query, got user %d", dayRepo.assignedUserID)
	}
}

func TestWorkerForbiddenOnUnassignedServiceDay(t *testing.T) {
	dayRepo := &fakeServiceDayRepo{byID: dayWithWorker(7, 99)} // assigned to someone else
	repo := emptyRepo()
	repo.ServiceDays = dayRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/service-days/7", mintToken(t, tm, "employee", 42), "")

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d", rr.Code)
	}
}

func TestWorkerSeesAssignedServiceDay(t *testing.T) {
	dayRepo := &fakeServiceDayRepo{byID: dayWithWorker(7, 42)}
	repo := emptyRepo()
	repo.ServiceDays = dayRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodGet, "/v1/service-days/7", mintToken(t, tm, "employee", 42), "")

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
}
