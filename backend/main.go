package main

import (
	"log"
	"net/http"
	"os"

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("ChessMatrix backend server started on :" + port)
	if err := http.ListenAndServe(":" + port, nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
