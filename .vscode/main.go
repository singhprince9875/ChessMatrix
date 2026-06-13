package main

import (
	"net/http"

	"your_project/api"
	"your_project/ws"
)

func main() {

	hub := ws.NewHub()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		api.ServeWS(hub, w, r)
	})

	http.ListenAndServe(":8080", nil)
}

