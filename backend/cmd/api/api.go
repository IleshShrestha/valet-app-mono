package main

import (
	"log"
	"net/http"
	"time"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type application struct {
	config     config
	repository repository.Repository
}

type config struct {
	addr string
	db   dbConfig
	env  string
}

type dbConfig struct {
	addr         string
	maxOpenConns int
	maxIdleConns int
	maxIdleTime  string
}

func (app *application) mount() http.Handler {

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", app.healthCheckHandler)
		r.Route("/users", func(r chi.Router) {
			r.Post("/", app.createUserHandler)
			r.Get("/", app.getAllUsersHandler)
			r.Route("/{userId}", func(r chi.Router) {
				r.Get("/", app.getUserHandler)
				r.Put("/", app.updateUserHandler)
				r.Delete("/", app.deleteUserHandler)
			})
		})
		r.Route("/shifts", func(r chi.Router) {
			r.Post("/", app.createShiftHandler)
			r.Get("/", app.getAllShiftsHandler)
			r.Get("/locations", app.getShiftLocationsHandler)
			r.Post("/check-location", app.checkLocationHandler)
			r.Route("/{shiftId}", func(r chi.Router) {
				r.Get("/", app.getShiftHandler)
				r.Put("/", app.updateShiftHandler)
				r.Delete("/", app.deleteShiftHandler)
			})
		})
		r.Route("/locations", func(r chi.Router) {
			r.Post("/", app.createLocationHandler)
		})
	})

	return r
}

func (app *application) run(mux http.Handler) error {

	srv := &http.Server{
		Addr:         app.config.addr,
		Handler:      mux,
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Minute,
	}
	log.Printf("Listening on %s\n", app.config.addr)

	return srv.ListenAndServe()
}
