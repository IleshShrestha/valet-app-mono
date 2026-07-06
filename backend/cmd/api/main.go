package main

import (
	"log"
	"strings"
	"valet-backend-go/internal/api"
	"valet-backend-go/internal/auth"
	"valet-backend-go/internal/database"
	"valet-backend-go/internal/env"
	"valet-backend-go/internal/repository"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env.local", ".env")

	addr := env.GetString("ADDR")
	environment := strings.ToLower(strings.TrimSpace(env.GetString("ENVIRONMENT")))

	dbAddr := env.GetString("DATABASE_URL")
	maxOpenConns := env.GetInt("MAX_OPEN_CONNECTIONS")
	maxIdleConns := env.GetInt("MAX_IDLE_CONNECTIONS")
	maxIdleTime := env.GetString("MAX_IDLE_TIME")

	jwtSecret := env.GetString("JWT_SECRET")
	accessTokenTTLMinutes := env.GetInt("ACCESS_TOKEN_TTL_MINUTES")
	refreshTokenTTLDays := env.GetInt("REFRESH_TOKEN_TTL_DAYS")

	if accessTokenTTLMinutes == 0 {
		accessTokenTTLMinutes = 15
	}
	if refreshTokenTTLDays == 0 {
		refreshTokenTTLDays = 30
	}
	if environment != "development" && jwtSecret == "" {
		log.Fatal("JWT_SECRET is required outside development")
	}
	if jwtSecret == "" {
		jwtSecret = "local-dev-only-secret-change-me"
	}

	db, err := database.NewPool(dbAddr, maxOpenConns, maxIdleConns, maxIdleTime)
	if err != nil {
		log.Panic("Failed to connect to database:", err)
	}
	defer db.Close()

	repo := repository.NewRepository(db)
	tokenManager := auth.NewTokenManager(jwtSecret, accessTokenTTLMinutes, refreshTokenTTLDays)

	app := api.New(api.Config{Addr: addr, Env: environment}, repo, tokenManager)
	log.Fatal(app.Run(app.Handler()))
}
