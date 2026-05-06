package main

import (
	"log"
	"valet-backend-go/internal/auth"
	"valet-backend-go/internal/database"
	"valet-backend-go/internal/env"
	"valet-backend-go/internal/repository"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config{addr: env.GetString("ADDR"), db: dbConfig{addr: env.GetString("DATABASE_URL"), maxOpenConns: env.GetInt("MAX_OPEN_CONNECTIONS"), maxIdleConns: env.GetInt("MAX_IDLE_CONNECTIONS"), maxIdleTime: env.GetString("MAX_IDLE_TIME")}, env: env.GetString("ENVIRONMENT"), auth: authConfig{jwtSecret: env.GetString("JWT_SECRET"), accessTokenTTLMinutes: env.GetInt("ACCESS_TOKEN_TTL_MINUTES"), refreshTokenTTLDays: env.GetInt("REFRESH_TOKEN_TTL_DAYS")}}
	if cfg.auth.accessTokenTTLMinutes == 0 {
		cfg.auth.accessTokenTTLMinutes = 15
	}
	if cfg.auth.refreshTokenTTLDays == 0 {
		cfg.auth.refreshTokenTTLDays = 30
	}
	if cfg.env != "development" && cfg.auth.jwtSecret == "" {
		log.Fatal("JWT_SECRET is required outside development")
	}
	if cfg.auth.jwtSecret == "" {
		cfg.auth.jwtSecret = "local-dev-only-secret-change-me"
	}
	db, err := database.NewPool(cfg.db.addr, cfg.db.maxOpenConns, cfg.db.maxIdleConns, cfg.db.maxIdleTime)
	if err != nil {
		log.Panic("Failed to connect to database:", err)
	}
	defer db.Close()
	repo := repository.NewRepository(db)
	app := &application{config: cfg, repository: repo, tokenManager: auth.NewTokenManager(cfg.auth.jwtSecret, cfg.auth.accessTokenTTLMinutes, cfg.auth.refreshTokenTTLDays)}
	log.Fatal(app.run(app.mount()))
}
