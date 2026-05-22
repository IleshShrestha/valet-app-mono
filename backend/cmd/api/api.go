package main

import (
	"log"
	"net/http"
	"time"
	"valet-backend-go/internal/auth"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type application struct {
	config       config
	repository   repository.Repository
	tokenManager *auth.TokenManager
}

type config struct {
	addr string
	db   dbConfig
	env  string
	auth authConfig
}

type authConfig struct {
	jwtSecret             string
	accessTokenTTLMinutes int
	refreshTokenTTLDays   int
}

type dbConfig struct {
	addr         string
	maxOpenConns int
	maxIdleConns int
	maxIdleTime  string
}

func (app *application) mount() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", app.healthCheckHandler)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", app.loginHandler)
			r.Post("/refresh", app.refreshHandler)
			r.Post("/logout", app.logoutHandler)
			r.With(app.requireAuth).Post("/logout-all", app.logoutAllHandler)
			r.With(app.requireAuth).Get("/me", app.meHandler)
		})

		r.Route("/users", func(r chi.Router) {
			r.With(app.requireAuth, requireRole("admin")).Post("/", app.createUserHandler)
			r.Get("/", app.getAllUsersHandler)
			r.Route("/{userId}", func(r chi.Router) {
				r.Get("/", app.getUserHandler)
				r.Put("/", app.updateUserHandler)
				r.Delete("/", app.deleteUserHandler)
			})
		})
		r.Route("/shifts", func(r chi.Router) {
			r.With(app.requireAuth, requireRole("admin")).Post("/", app.createShiftHandler)
			r.With(app.requireAuth).Get("/", app.getAllShiftsHandler)
			r.Get("/locations", app.getShiftLocationsHandler)
			r.Post("/check-location", app.checkLocationHandler)
			r.Route("/{shiftId}", func(r chi.Router) {
				r.With(app.requireAuth).Get("/", app.getShiftHandler)
				r.Put("/", app.updateShiftHandler)
				r.Delete("/", app.deleteShiftHandler)
			})
		})
		r.Route("/locations", func(r chi.Router) {
			r.With(app.requireAuth, requireRole("admin")).Post("/", app.createLocationHandler)
		})
	})
	return r
}

func (app *application) run(mux http.Handler) error {
	srv := &http.Server{Addr: app.config.addr, Handler: mux, WriteTimeout: 30 * time.Second, ReadTimeout: 15 * time.Second, IdleTimeout: time.Minute}
	log.Printf("Listening on %s\n", app.config.addr)
	return srv.ListenAndServe()
}
