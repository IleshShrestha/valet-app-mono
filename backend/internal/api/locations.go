package api

import (
	"log"
	"net/http"
	"strconv"
	"valet-backend-go/internal/geo"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type CheckLocationPayload struct {
	UserLatitude  float64 `json:"user_latitude" validate:"min=-90,max=90"`
	UserLongitude float64 `json:"user_longitude" validate:"min=-180,max=180"`
	LocationID    int64   `json:"location_id" validate:"required,min=1"`
}

// LocationBillingPayload is the billing config accepted on create/update. All
// rate fields are optional; billing_type defaults to hourly_per_person.
type LocationBillingPayload struct {
	BillingType       string   `json:"billing_type" validate:"omitempty,oneof=hourly_per_person flat_per_shift"`
	HourlyRate        *float64 `json:"hourly_rate" validate:"omitempty,gte=0"`
	SingleShiftRate   *float64 `json:"single_shift_rate" validate:"omitempty,gte=0"`
	DoubleShiftRate   *float64 `json:"double_shift_rate" validate:"omitempty,gte=0"`
	HolidayMultiplier *float64 `json:"holiday_multiplier" validate:"omitempty,gte=0"`
	HolidayFlatBonus  *float64 `json:"holiday_flat_bonus" validate:"omitempty,gte=0"`
	UsesHolidayPay    bool     `json:"uses_holiday_pay"`
}

func (b LocationBillingPayload) applyTo(loc *repository.Location) {
	loc.BillingType = b.BillingType
	loc.HourlyRate = b.HourlyRate
	loc.SingleShiftRate = b.SingleShiftRate
	loc.DoubleShiftRate = b.DoubleShiftRate
	loc.HolidayMultiplier = b.HolidayMultiplier
	loc.HolidayFlatBonus = b.HolidayFlatBonus
	loc.UsesHolidayPay = b.UsesHolidayPay
}

type CreateLocationPayload struct {
	Latitude  float64 `json:"latitude" validate:"min=-90,max=90"`
	Longitude float64 `json:"longitude" validate:"min=-180,max=180"`
	Name      string  `json:"name" validate:"required"`
	Radius    float64 `json:"radius" validate:"gt=0,max=500"`
	LocationBillingPayload
}

type UpdateLocationBillingPayload struct {
	LocationBillingPayload
}

type checkLocationResponse struct {
	InsideGeofence bool    `json:"inside_geofence"`
	DistanceMeters float64 `json:"distance_meters"`
}

// getLocationSummariesHandler returns id+name pairs for pickers.
func (app *Application) getLocationSummariesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	locations, err := app.repository.Locations.ListSummaries(ctx, authUserFromCtx(ctx).OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, locations); err != nil {
		app.internalServerError(w, r, err)
	}
}

// getAllLocationsHandler returns full locations (incl. billing config) for admins.
func (app *Application) getAllLocationsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	locations, err := app.repository.Locations.GetAll(ctx, authUserFromCtx(ctx).OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, locations); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) checkLocationHandler(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var payload CheckLocationPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	loc, err := app.repository.Locations.GetByID(ctx, payload.LocationID, authUserFromCtx(ctx).OrganizationID)
	if err != nil {
		log.Printf("check-location: GetByID failed req_id=%s location_id=%d err=%v", reqID, payload.LocationID, err)
		app.notFoundOrInternal(w, r, err)
		return
	}
	distance := geo.DistanceMeters(payload.UserLatitude, payload.UserLongitude, loc.Latitude, loc.Longitude)
	resp := checkLocationResponse{
		InsideGeofence: distance <= loc.Radius,
		DistanceMeters: distance,
	}
	if err := app.jsonResponse(w, http.StatusOK, resp); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) createLocationHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateLocationPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	location := &repository.Location{
		OrganizationID: authUserFromCtx(r.Context()).OrganizationID,
		Latitude:       payload.Latitude,
		Longitude:      payload.Longitude,
		Name:           payload.Name,
		Radius:         payload.Radius,
	}
	payload.LocationBillingPayload.applyTo(location)

	ctx := r.Context()
	if err := app.repository.Locations.Create(ctx, location); err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusCreated, location); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) updateLocationHandler(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "locationId"), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var payload UpdateLocationBillingPayload
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
	location := &repository.Location{ID: id, OrganizationID: orgID}
	payload.LocationBillingPayload.applyTo(location)

	if err := app.repository.Locations.UpdateBilling(ctx, location); err != nil {
		app.notFoundOrInternal(w, r, err)
		return
	}
	updated, err := app.repository.Locations.GetByID(ctx, id, orgID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, updated); err != nil {
		app.internalServerError(w, r, err)
	}
}
