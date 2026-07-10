package api

import (
	"net/http"
	"time"
	"valet-backend-go/internal/billing"
	"valet-backend-go/internal/repository"
)

const invoiceLookbackDays = 14

func floatOrZero(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

func toLocationBilling(loc *repository.Location) billing.LocationBilling {
	return billing.LocationBilling{
		LocationName:      loc.Name,
		BillingType:       loc.BillingType,
		HourlyRate:        floatOrZero(loc.HourlyRate),
		SingleShiftRate:   floatOrZero(loc.SingleShiftRate),
		DoubleShiftRate:   floatOrZero(loc.DoubleShiftRate),
		HolidayMultiplier: floatOrZero(loc.HolidayMultiplier),
		HolidayFlatBonus:  floatOrZero(loc.HolidayFlatBonus),
		UsesHolidayPay:    loc.UsesHolidayPay,
	}
}

func toServiceDayInput(day *repository.ServiceDay) billing.ServiceDayInput {
	segs := make([]billing.SegmentInput, 0, len(day.Segments))
	for _, s := range day.Segments {
		segs = append(segs, billing.SegmentInput{Workers: len(s.AssignedUsers), Hours: s.Hours})
	}
	return billing.ServiceDayInput{
		Date:        day.Date,
		IsHoliday:   day.IsHoliday,
		HolidayName: day.HolidayName,
		Segments:    segs,
	}
}

// getInvoiceServiceDaysHandler lists completed service days from the last 2
// weeks that are eligible to be invoiced.
func (app *Application) getInvoiceServiceDaysHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	since := time.Now().AddDate(0, 0, -invoiceLookbackDays)
	days, err := app.repository.ServiceDays.GetCompletedSince(ctx, authUserFromCtx(ctx).OrganizationID, since)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, days); err != nil {
		app.internalServerError(w, r, err)
	}
}

// previewInvoiceHandler computes an itemized invoice for the selected service
// days using each day's location billing config.
func (app *Application) previewInvoiceHandler(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ServiceDayIDs []int64 `json:"service_day_ids" validate:"required,min=1"`
	}
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	orgID := authUserFromCtx(ctx).OrganizationID

	toBill := make([]billing.DayToBill, 0, len(payload.ServiceDayIDs))
	for _, id := range payload.ServiceDayIDs {
		day, err := app.repository.ServiceDays.GetByID(ctx, id, orgID)
		if err != nil {
			app.notFoundOrInternal(w, r, err)
			return
		}
		loc, err := app.repository.Locations.GetByID(ctx, day.LocationID, orgID)
		if err != nil {
			app.notFoundOrInternal(w, r, err)
			return
		}
		toBill = append(toBill, billing.DayToBill{
			Loc: toLocationBilling(loc),
			Day: toServiceDayInput(day),
		})
	}

	invoice := billing.BuildInvoice(toBill)
	if err := app.jsonResponse(w, http.StatusOK, invoice); err != nil {
		app.internalServerError(w, r, err)
	}
}
