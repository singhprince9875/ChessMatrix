package main

import (
	"log"
	"net/http"

	"chessmatrix/backend/api"
	"chessmatrix/backend/db"
	"chessmatrix/backend/ws"
)

func main() {
	// Initialize DB (optional connection setup)
	db.Connect()

	// Initialize Websocket Hub
	hub := ws.NewHub()

	// Set routing
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		api.ServeWS(hub, w, r)
	})

	log.Println("ChessMatrix backend server started on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
