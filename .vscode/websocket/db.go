package db

import (
	"database/sql"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect() {

	connStr := "postgres://user:pass@localhost:5432/chess?sslmode=disable"

	db, _ := sql.Open("postgres", connStr)

	DB = db
}