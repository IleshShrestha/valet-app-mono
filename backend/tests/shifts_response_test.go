package main

import (
	"encoding/json"
	"testing"
	"time"
	"valet-backend-go/internal/repository"
)

func TestShiftResponseJSONIncludesAssignedUsersAndMetadata(t *testing.T) {
	checkIn := time.Date(2026, 5, 7, 18, 0, 0, 0, time.UTC)

	shift := repository.Shift{
		ID:         1,
		Title:      "Wedding Valet",
		Date:       "2026-05-10",
		StartTime:  "17:00:00",
		EndTime:    "23:00:00",
		LocationID: 99,
		AssignedUsers: []repository.AssignedUser{
			{
				ID:          3,
				FirstName:   "John",
				LastName:    "Smith",
				Email:       "john@example.com",
				Role:        "employee",
				CheckInTime: &checkIn,
			},
		},
	}

	b, err := json.Marshal(shift)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(b, &payload); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	usersRaw, ok := payload["assigned_users"].([]any)
	if !ok || len(usersRaw) != 1 {
		t.Fatalf("expected assigned_users with one user, got %#v", payload["assigned_users"])
	}

	userObj := usersRaw[0].(map[string]any)
	if _, exists := userObj["password_hash"]; exists {
		t.Fatalf("password_hash should never be present in assigned user response")
	}
	if userObj["check_in_time"] == nil {
		t.Fatalf("assignment metadata missing from response: %#v", userObj)
	}
}

func TestShiftResponseJSONUsesEmptyAssignedUsersArray(t *testing.T) {
	shift := repository.Shift{ID: 2, AssignedUsers: []repository.AssignedUser{}}

	b, err := json.Marshal(shift)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(b, &payload); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	usersRaw, ok := payload["assigned_users"].([]any)
	if !ok {
		t.Fatalf("assigned_users should be an array, got %#v", payload["assigned_users"])
	}
	if len(usersRaw) != 0 {
		t.Fatalf("expected empty assigned_users, got %d", len(usersRaw))
	}
}
