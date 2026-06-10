package main

import (
	"log"

	"kill-the-resume/backend/internal/config"
	"kill-the-resume/backend/internal/db"
	"kill-the-resume/backend/internal/httpx"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid backend configuration: %v", err)
	}
	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}

	router := httpx.NewRouter(cfg, database)
	log.Printf("kill-the-resume backend listening on %s", cfg.ServerAddr)
	if err := router.Run(cfg.ServerAddr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
