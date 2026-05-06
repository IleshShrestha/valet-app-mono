package main

import (
	"errors"
	"log"
	"net/http"
	"valet-backend-go/internal/geo"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5/middleware"
)

type CheckLocationPayload struct {
	UserLatitude  float64 `json:"user_latitude" validate:"min=-90,max=90"`
	UserLongitude float64 `json:"user_longitude" validate:"min=-180,max=180"`
	LocationID    int64   `json:"location_id" validate:"required,min=1"`
}
type CreateLocationPayload struct {
	Latitude  float64 `json:"latitude" validate:"min=-90,max=90"`
	Longitude float64 `json:"longitude" validate:"min=-180,max=180"`
	Name      string  `json:"name" validate:"required"`
	Radius    float64 `json:"radius" validate:"min=-500,max=500"`
}
type checkLocationResponse struct {
	InsideGeofence bool    `json:"inside_geofence"`
	DistanceMeters float64 `json:"distance_meters"`
}

func (app *application) getShiftLocationsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	locations, err := app.repository.Locations.ListSummaries(ctx)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, locations); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) checkLocationHandler(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var payload CheckLocationPayload
	if err := readJson(w, r, &payload); err != nil {
		log.Printf("check-location: readJson failed req_id=%s err=%v", reqID, err)
		app.badRequestResponse(w, r, err)
		return
	}
	log.Printf("check-location: body parsed req_id=%s user_lat=%f user_lng=%f location_id=%d",
		reqID, payload.UserLatitude, payload.UserLongitude, payload.LocationID)

	if err := Validate.Struct(payload); err != nil {
		log.Printf("check-location: validation failed req_id=%s err=%v", reqID, err)
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	loc, err := app.repository.Locations.GetByID(ctx, payload.LocationID)
	if err != nil {
		log.Printf("check-location: GetByID failed req_id=%s location_id=%d err=%v", reqID, payload.LocationID, err)
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}
	distance := geo.DistanceMeters(
		payload.UserLatitude,
		payload.UserLongitude,
		loc.Latitude,
		loc.Longitude,
	)
	insideGeofence := distance <= float64(loc.Radius)

	resp := checkLocationResponse{
		InsideGeofence: insideGeofence,
		DistanceMeters: distance,
	}

	if err := app.jsonResponse(w, http.StatusOK, resp); err != nil {
		app.internalServerError(w, r, err)
		return
	}
}

func (app *application) createLocationHandler(w http.ResponseWriter, r *http.Request) {

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
		Latitude:  payload.Latitude,
		Longitude: payload.Longitude,
		Name:      payload.Name,
		Radius:    payload.Radius,
	}
	ctx := r.Context()

	if err := app.repository.Locations.Create(ctx, location); err != nil {
		app.internalServerError(w, r, err)
	}

	if err := app.jsonResponse(w, http.StatusCreated, location); err != nil {
		app.internalServerError(w, r, err)
	}
	log.Printf("created location: %s", location.Name)

}
