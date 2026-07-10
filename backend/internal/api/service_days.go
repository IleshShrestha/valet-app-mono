package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
)

type SegmentPayload struct {
	Name            string  `json:"name"`
	TimeStart       string  `json:"start_time" validate:"required"`
	TimeEnd         string  `json:"end_time" validate:"required"`
	AssignedUserIDs []int64 `json:"assigned_user_ids"`
}

type ServiceDayPayload struct {
	Title       string           `json:"title" validate:"required"`
	Date        string           `json:"date" validate:"required"`
	LocationID  int64            `json:"location_id" validate:"required,min=1"`
	IsHoliday   bool             `json:"is_holiday"`
	HolidayName string           `json:"holiday_name"`
	Segments    []SegmentPayload `json:"segments" validate:"required,min=1,dive"`
}

var validServiceDayStatuses = map[string]struct{}{
	"scheduled": {}, "in_review": {}, "completed": {}, "cancelled": {},
}

func roleCanSeeAll(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin", "manager":
		return true
	default:
		return false
	}
}

func serviceDayAssignedToUser(day *repository.ServiceDay, userID int64) bool {
	for _, seg := range day.Segments {
		for _, u := range seg.AssignedUsers {
			if u.ID == userID {
				return true
			}
		}
	}
	return false
}

// deriveSegmentName defaults a blank segment name to morning/evening based on
// the start time (before noon = morning, otherwise evening).
func deriveSegmentName(name, startTime string) string {
	if strings.TrimSpace(name) != "" {
		return strings.TrimSpace(name)
	}
	hour := 0
	if len(startTime) >= 2 {
		hour, _ = strconv.Atoi(startTime[:2])
	}
	if hour < 12 {
		return "morning"
	}
	return "evening"
}

func segmentsFromPayload(payloads []SegmentPayload) []repository.Segment {
	segments := make([]repository.Segment, 0, len(payloads))
	for _, p := range payloads {
		users := make([]repository.AssignedUser, 0, len(p.AssignedUserIDs))
		for _, id := range p.AssignedUserIDs {
			if id > 0 {
				users = append(users, repository.AssignedUser{ID: id})
			}
		}
		segments = append(segments, repository.Segment{
			Name:          deriveSegmentName(p.Name, p.TimeStart),
			StartTime:     p.TimeStart,
			EndTime:       p.TimeEnd,
			AssignedUsers: users,
		})
	}
	return segments
}

func serviceDayFromPayload(payload ServiceDayPayload, organizationID string) *repository.ServiceDay {
	return &repository.ServiceDay{
		OrganizationID: organizationID,
		Title:          payload.Title,
		LocationID:     payload.LocationID,
		Date:           payload.Date,
		IsHoliday:      payload.IsHoliday,
		HolidayName:    payload.HolidayName,
		Segments:       segmentsFromPayload(payload.Segments),
	}
}

func serviceDayIDParam(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "serviceDayId"), 10, 64)
}

func (app *Application) createServiceDayHandler(w http.ResponseWriter, r *http.Request) {
	var payload ServiceDayPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	day := serviceDayFromPayload(payload, authUserFromCtx(ctx).OrganizationID)
	if err := app.repository.ServiceDays.Create(ctx, day); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			app.badRequestResponse(w, r, err) // unknown assigned user or location
			return
		}
		app.internalServerError(w, r, err)
		return
	}
	created, err := app.repository.ServiceDays.GetByID(ctx, day.ID, day.OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusCreated, created); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) getAllServiceDaysHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	authUser := authUserFromCtx(ctx)

	var (
		days []*repository.ServiceDay
		err  error
	)
	if roleCanSeeAll(authUser.Role) {
		days, err = app.repository.ServiceDays.GetAll(ctx, authUser.OrganizationID)
	} else {
		days, err = app.repository.ServiceDays.GetAllByAssignedUser(ctx, authUser.UserID, authUser.OrganizationID)
	}
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, days); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) getServiceDayHandler(w http.ResponseWriter, r *http.Request) {
	id, err := serviceDayIDParam(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	authUser := authUserFromCtx(ctx)
	day, err := app.repository.ServiceDays.GetByID(ctx, id, authUser.OrganizationID)
	if err != nil {
		app.notFoundOrInternal(w, r, err)
		return
	}
	if !roleCanSeeAll(authUser.Role) && !serviceDayAssignedToUser(day, authUser.UserID) {
		_ = writeJSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, day); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) updateServiceDayHandler(w http.ResponseWriter, r *http.Request) {
	id, err := serviceDayIDParam(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var payload ServiceDayPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	ctx := r.Context()
	day := serviceDayFromPayload(payload, authUserFromCtx(ctx).OrganizationID)
	day.ID = id
	if err := app.repository.ServiceDays.Update(ctx, day); err != nil {
		app.notFoundOrInternal(w, r, err)
		return
	}
	updated, err := app.repository.ServiceDays.GetByID(ctx, id, day.OrganizationID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, updated); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) deleteServiceDayHandler(w http.ResponseWriter, r *http.Request) {
	id, err := serviceDayIDParam(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	if err := app.repository.ServiceDays.Delete(ctx, id, authUserFromCtx(ctx).OrganizationID); err != nil {
		app.notFoundOrInternal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (app *Application) updateServiceDayStatusHandler(w http.ResponseWriter, r *http.Request) {
	id, err := serviceDayIDParam(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var payload struct {
		Status string `json:"status" validate:"required"`
	}
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if _, ok := validServiceDayStatuses[payload.Status]; !ok {
		_ = writeJSONError(w, http.StatusBadRequest, "invalid status")
		return
	}
	ctx := r.Context()
	orgID := authUserFromCtx(ctx).OrganizationID
	if err := app.repository.ServiceDays.UpdateStatus(ctx, id, orgID, payload.Status); err != nil {
		app.notFoundOrInternal(w, r, err)
		return
	}
	updated, err := app.repository.ServiceDays.GetByID(ctx, id, orgID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, updated); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *Application) reviewServiceDaysHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID := authUserFromCtx(ctx).OrganizationID
	if err := app.repository.ServiceDays.PromoteEndedToReview(ctx, orgID); err != nil {
		app.internalServerError(w, r, err)
		return
	}
	days, err := app.repository.ServiceDays.ListForReview(ctx, orgID)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, days); err != nil {
		app.internalServerError(w, r, err)
	}
}
