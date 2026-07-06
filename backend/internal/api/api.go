package api

import (
	"log"
	"net/http"
	"time"
	"valet-backend-go/internal/auth"
	"valet-backend-go/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Config holds the runtime settings the HTTP layer needs. Environment parsing
// and dependency construction live in the cmd/api entrypoint.
type Config struct {
	Addr string
	Env  string
}

type Application struct {
	config       Config
	repository   repository.Repository
	tokenManager *auth.TokenManager
}

// New wires an Application from its already-constructed dependencies. This is
// the seam the entrypoint and tests use.
func New(cfg Config, repo repository.Repository, tm *auth.TokenManager) *Application {
	return &Application{config: cfg, repository: repo, tokenManager: tm}
}

// Handler builds the fully-routed HTTP handler (middleware + /v1 routes).
func (app *Application) Handler() http.Handler {
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
			r.With(app.requireAuth).Get("/", app.getAllUsersHandler)
			r.Route("/{userId}", func(r chi.Router) {
				r.With(app.requireAuth).Get("/", app.getUserHandler)
				r.With(app.requireAuth, requireRole("admin")).Put("/", app.updateUserHandler)
				r.With(app.requireAuth, requireRole("admin")).Delete("/", app.deleteUserHandler)
			})
		})
		r.Route("/shifts", func(r chi.Router) {
			r.With(app.requireAuth, requireRole("admin")).Post("/", app.createShiftHandler)
			r.With(app.requireAuth).Get("/", app.getAllShiftsHandler)
			r.With(app.requireAuth).Get("/locations", app.getShiftLocationsHandler)
			r.With(app.requireAuth).Post("/check-location", app.checkLocationHandler)
			r.Route("/{shiftId}", func(r chi.Router) {
				r.With(app.requireAuth).Get("/", app.getShiftHandler)
				r.With(app.requireAuth, requireRole("admin")).Put("/", app.updateShiftHandler)
				r.With(app.requireAuth, requireRole("admin")).Delete("/", app.deleteShiftHandler)
			})
		})
		r.Route("/locations", func(r chi.Router) {
			r.With(app.requireAuth, requireRole("admin")).Post("/", app.createLocationHandler)
		})
	})
	return r
}

// Run starts the HTTP server with the provided handler.
func (app *Application) Run(mux http.Handler) error {
	srv := &http.Server{Addr: app.config.Addr, Handler: mux, WriteTimeout: 30 * time.Second, ReadTimeout: 15 * time.Second, IdleTimeout: time.Minute}
	log.Printf("Listening on %s\n", app.config.Addr)
	return srv.ListenAndServe()
}
