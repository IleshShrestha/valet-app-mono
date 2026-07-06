package api

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
)

type CreateShiftPayload struct {
	Title           string  `json:"title" validate:"required"`
	Date            string  `json:"date" validate:"required"`
	TimeStart       string  `json:"start_time" validate:"required"`
	TimeEnd         string  `json:"end_time" validate:"required"`
	LocationID      int64   `json:"location_id" validate:"required,min=1"`
	AssignedUserIDs []int64 `json:"assigned_user_ids"`
}

func assignedUsersFromIDs(ids []int64) []repository.AssignedUser {
	users := make([]repository.AssignedUser, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		users = append(users, repository.AssignedUser{ID: id})
	}
	return users
}

func roleCanSeeAllShifts(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin", "manager":
		return true
	default:
		return false
	}
}

func shiftAssignedToUser(shift *repository.Shift, userID int64) bool {
	for _, assignedUser := range shift.AssignedUsers {
		if assignedUser.ID == userID {
			return true
		}
	}
	return false
}

func (app *Application) createShiftHandler(w http.ResponseWriter, r *http.Request) {

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
		OrganizationID: authUserFromCtx(r.Context()).OrganizationID,
		Title:          payload.Title,
		Date:           payload.Date,
		LocationID:     payload.LocationID,
		StartTime:      payload.TimeStart,
		EndTime:        payload.TimeEnd,
		AssignedUsers:  assignedUsersFromIDs(payload.AssignedUserIDs),
	}
	ctx := r.Context()

	if err := app.repository.Shifts.Create(ctx, shift); err != nil {
		app.internalServerError(w, r, err)
		return
	}
	created, err := app.repository.Shifts.GetByID(ctx, shift.ID, shift.OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	if err := app.jsonResponse(w, http.StatusCreated, created); err != nil {
		app.internalServerError(w, r, err)
	}
	log.Printf("created shift: %s", shift.Title)

}

func (app *Application) getAllShiftsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	authUser := authUserFromCtx(ctx)

	var (
		shifts []*repository.Shift
		err    error
	)
	if roleCanSeeAllShifts(authUser.Role) {
		shifts, err = app.repository.Shifts.GetAll(ctx, authUser.OrganizationID)
	} else {
		shifts, err = app.repository.Shifts.GetAllByAssignedUser(ctx, authUser.UserID, authUser.OrganizationID)
	}
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, shifts); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) getShiftHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "shiftId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	authUser := authUserFromCtx(ctx)
	shift, err := app.repository.Shifts.GetByID(ctx, id, authUser.OrganizationID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}
	if !roleCanSeeAllShifts(authUser.Role) && !shiftAssignedToUser(shift, authUser.UserID) {
		_ = writeJSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, shift); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) updateShiftHandler(w http.ResponseWriter, r *http.Request) {
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
		ID:             id,
		OrganizationID: authUserFromCtx(r.Context()).OrganizationID,
		Title:          payload.Title,
		Date:           payload.Date,
		LocationID:     payload.LocationID,
		StartTime:      payload.TimeStart,
		EndTime:        payload.TimeEnd,
		AssignedUsers:  assignedUsersFromIDs(payload.AssignedUserIDs),
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

	updated, err := app.repository.Shifts.GetByID(ctx, id, shift.OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, updated); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) deleteShiftHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "shiftId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	if err := app.repository.Shifts.Delete(ctx, id, authUserFromCtx(ctx).OrganizationID); err != nil {
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
