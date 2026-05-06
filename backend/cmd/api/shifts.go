package main

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
)

type CreateShiftPayload struct {
	Title      string `json:"title" validate:"required"`
	Date       string `json:"date" validate:"required"`
	TimeStart  string `json:"start_time" validate:"required"`
	TimeEnd    string `json:"end_time" validate:"required"`
	LocationID int64  `json:"location_id" validate:"required,min=1"`
}

func (app *application) createShiftHandler(w http.ResponseWriter, r *http.Request) {

	var payload CreateShiftPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	shift := &repository.Shift{
		Title:      payload.Title,
		Date:       payload.Date,
		LocationID: payload.LocationID,
		StartTime:  payload.TimeStart,
		EndTime:    payload.TimeEnd,
	}
	ctx := r.Context()

	if err := app.repository.Shifts.Create(ctx, shift); err != nil {
		app.internalServerError(w, r, err)
	}

	if err := app.jsonResponse(w, http.StatusCreated, shift); err != nil {
		app.internalServerError(w, r, err)
	}
	log.Printf("created shift: %s", shift.Title)

}

func (app *application) getAllShiftsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	shifts, err := app.repository.Shifts.GetAll(ctx)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, shifts); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) getShiftHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "shiftId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	shift, err := app.repository.Shifts.GetByID(ctx, id)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, shift); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) updateShiftHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "shiftId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload CreateShiftPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	shift := &repository.Shift{
		ID:         id,
		Title:      payload.Title,
		Date:       payload.Date,
		LocationID: payload.LocationID,
		StartTime:  payload.TimeStart,
		EndTime:    payload.TimeEnd,
	}
	ctx := r.Context()
	if err := app.repository.Shifts.Update(ctx, shift); err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	updated, err := app.repository.Shifts.GetByID(ctx, id)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, updated); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) deleteShiftHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "shiftId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	if err := app.repository.Shifts.Delete(ctx, id); err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
