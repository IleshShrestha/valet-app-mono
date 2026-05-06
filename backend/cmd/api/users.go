package main

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserPayload struct {
	Role      string `json:"role" validate:"required" `
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
}

type UpdateUserPayload struct {
	Role      string  `json:"role" validate:"required"`
	FirstName string  `json:"first_name" validate:"required"`
	LastName  string  `json:"last_name" validate:"required"`
	Email     string  `json:"email" validate:"required,email"`
	Password  *string `json:"password,omitempty" validate:"omitempty,min=8"`
}

func (app *application) createUserHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreateUserPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}

	user := &repository.User{
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Email:     payload.Email,
		Password:  string(hashedPassword),
		Role:      payload.Role,
	}
	ctx := r.Context()

	if err := app.repository.Users.Create(ctx, user); err != nil {
		app.internalServerError(w, r, err)
	}

	if err := app.jsonResponse(w, http.StatusCreated, user); err != nil {
		app.internalServerError(w, r, err)
	}
	log.Printf("created user: %s", user.FirstName)
}

func (app *application) getAllUsersHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	users, err := app.repository.Users.GetAll(ctx)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, users); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) getUserHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "userId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	ctx := r.Context()
	user, err := app.repository.Users.GetById(ctx, id)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)

		default:
			app.internalServerError(w, r, err)
		}
		return
	}
	if err := writeJSON(w, http.StatusOK, user); err != nil {
		app.internalServerError(w, r, err)
		return
	}

}

func (app *application) updateUserHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "userId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var payload UpdateUserPayload
	if err := readJson(w, r, &payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := Validate.Struct(payload); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var hashedPassword *string
	if payload.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*payload.Password), bcrypt.DefaultCost)
		if err != nil {
			app.internalServerError(w, r, err)
			return
		}
		h := string(hash)
		hashedPassword = &h
	}

	ctx := r.Context()
	err = app.repository.Users.Update(ctx, id, payload.Role, payload.FirstName, payload.LastName, payload.Email, hashedPassword)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			app.notFoundResponse(w, r, err)
		default:
			app.internalServerError(w, r, err)
		}
		return
	}

	user, err := app.repository.Users.GetById(ctx, id)
	if err != nil {
		app.internalServerError(w, r, err)
		return
	}
	if err := app.jsonResponse(w, http.StatusOK, user); err != nil {
		app.internalServerError(w, r, err)
	}
}

func (app *application) deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "userId")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	ctx := r.Context()
	if err := app.repository.Users.Delete(ctx, id); err != nil {
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
