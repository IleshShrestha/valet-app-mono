package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"valet-backend-go/internal/repository"
)

func ptr(v float64) *float64 { return &v }

// End-to-end preview: an hourly location ($35) with a 3-worker, 5-hour segment
// should invoice at $525 (the spec example), driven through the real route.
func TestInvoicePreviewComputesTotal(t *testing.T) {
	dayRepo := &fakeServiceDayRepo{
		byID: &repository.ServiceDay{
			ID: 1, Title: "Wedding", LocationID: 9, Date: "2025-06-17",
			Status: "completed",
			Segments: []repository.Segment{
				{ID: 10, Name: "evening", Hours: 5, AssignedUsers: []repository.AssignedUser{{ID: 1}, {ID: 2}, {ID: 3}}},
			},
		},
	}
	locRepo := &fakeLocationRepo{
		byID: &repository.Location{
			ID: 9, Name: "Grand Hotel", BillingType: "hourly_per_person", HourlyRate: ptr(35),
		},
	}
	repo := emptyRepo()
	repo.ServiceDays = dayRepo
	repo.Locations = locRepo
	app, tm := newTestApp(repo)

	rr := doRequest(t, app, http.MethodPost, "/v1/invoices/preview",
		mintToken(t, tm, "admin", 1), `{"service_day_ids":[1]}`)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d (body=%s)", rr.Code, rr.Body.String())
	}

	var body struct {
		Data struct {
			Total         float64 `json:"total"`
			TotalLabel    string  `json:"total_label"`
			UnpricedCount int     `json:"unpriced_count"`
			Lines         []struct {
				LocationName  string  `json:"location_name"`
				Workers       int     `json:"workers"`
				Subtotal      float64 `json:"subtotal"`
				SubtotalLabel string  `json:"subtotal_label"`
			} `json:"lines"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if body.Data.Total != 525 {
		t.Fatalf("want total 525, got %v", body.Data.Total)
	}
	if body.Data.TotalLabel != "$525.00" {
		t.Fatalf("want $525.00, got %s", body.Data.TotalLabel)
	}
	if len(body.Data.Lines) != 1 || body.Data.Lines[0].Workers != 3 {
		t.Fatalf("unexpected lines: %#v", body.Data.Lines)
	}
	if body.Data.Lines[0].LocationName != "Grand Hotel" {
		t.Fatalf("want location name Grand Hotel, got %q", body.Data.Lines[0].LocationName)
	}
}
