package main

import (
	"log"
	"valet-backend-go/internal/database"
	"valet-backend-go/internal/env"
	"valet-backend-go/internal/repository"

	"github.com/joho/godotenv"
)

const version = "0.0.1"

func main() {
	// loading environment vars
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	cfg := config{
		addr: env.GetString("ADDR"),
		db: dbConfig{
			addr:         env.GetString("DATABASE_URL"),
			maxOpenConns: env.GetInt("MAX_OPEN_CONNECTIONS"),
			maxIdleConns: env.GetInt("MAX_IDLE_CONNECTIONS"),
			maxIdleTime:  env.GetString("MAX_IDLE_TIME"),
		},
		env: env.GetString("ENVIRONMENT"),
	}

	// database connection
	db, err := database.NewPool(cfg.db.addr, cfg.db.maxOpenConns, cfg.db.maxIdleConns, cfg.db.maxIdleTime)
	if err != nil {
		log.Panic("Failed to connect to database:", err)
	}

	defer db.Close()

	log.Println("Connected to database with pools")
	// repository instantiation
	repo := repository.NewRepository(db)

	// application configuration
	app := &application{
		config:     cfg,
		repository: repo,
	}
	// mounting and running the application
	mux := app.mount()

	log.Fatal(app.run(mux))
}
