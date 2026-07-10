package repository_test

import (
	"encoding/json"
	"testing"
	"time"

	"valet-backend-go/internal/repository"
)

func TestServiceDayJSONIncludesSegmentsAndAssignedUsers(t *testing.T) {
	checkIn := time.Date(2026, 5, 7, 18, 0, 0, 0, time.UTC)

	day := repository.ServiceDay{
		ID:           1,
		Title:        "Wedding Valet",
		LocationID:   99,
		LocationName: "Grand Hotel",
		Date:         "2026-05-10",
		Status:       "completed",
		Segments: []repository.Segment{
			{
				ID:        5,
				Name:      "evening",
				StartTime: "17:00:00",
				EndTime:   "23:00:00",
				Hours:     6,
				AssignedUsers: []repository.AssignedUser{
					{ID: 3, FirstName: "John", LastName: "Smith", Email: "john@example.com", Role: "employee", CheckInTime: &checkIn},
				},
			},
		},
	}

	b, err := json.Marshal(day)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(b, &payload); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	segments, ok := payload["segments"].([]any)
	if !ok || len(segments) != 1 {
		t.Fatalf("expected one segment, got %#v", payload["segments"])
	}
	seg := segments[0].(map[string]any)
	users, ok := seg["assigned_users"].([]any)
	if !ok || len(users) != 1 {
		t.Fatalf("expected one assigned user, got %#v", seg["assigned_users"])
	}
	userObj := users[0].(map[string]any)
	if _, exists := userObj["password_hash"]; exists {
		t.Fatal("password_hash should never appear in an assigned user response")
	}
	if userObj["check_in_time"] == nil {
		t.Fatalf("assignment metadata missing: %#v", userObj)
	}
}

func TestServiceDayJSONUsesEmptyArrays(t *testing.T) {
	day := repository.ServiceDay{ID: 2, Segments: []repository.Segment{}}
	b, err := json.Marshal(day)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(b, &payload); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	segments, ok := payload["segments"].([]any)
	if !ok {
		t.Fatalf("segments should be an array, got %#v", payload["segments"])
	}
	if len(segments) != 0 {
		t.Fatalf("expected empty segments, got %d", len(segments))
	}
}
