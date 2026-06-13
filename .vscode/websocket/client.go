package ws

type Hub struct {
	Rooms map[string]*Room
}

func NewHub() *Hub {
	return &Hub{
		Rooms: make(map[string]*Room),
	}
}

func (h *Hub) GetRoom(id string) *Room {

	room, exists := h.Rooms[id]

	if !exists {
		room = NewRoom(id)
		h.Rooms[id] = room
	}

	return room
}





package ws

import (
	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
	Room *Room
	Color string
}






package api

import (
	"net/http"

	"github.com/gorilla/websocket"
	"your_project/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ServeWS(hub *ws.Hub, w http.ResponseWriter, r *http.Request) {

	conn, _ := upgrader.Upgrade(w, r, nil)

	roomID := r.URL.Query().Get("room")

	room := hub.GetRoom(roomID)

	client := &ws.Client{
		Conn: conn,
		Send: make(chan []byte),
		Room: room,
	}

	room.Clients[client] = true

	go readPump(client)
	go writePump(client)
}