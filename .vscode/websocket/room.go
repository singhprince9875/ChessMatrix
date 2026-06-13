package ws

import (
	"sync"
)

type Room struct {
	ID      string
	Clients map[*Client]bool
	Board   *Board
	mu      sync.Mutex
}

func NewRoom(id string) *Room {
	return &Room{
		ID:      id,
		Clients: make(map[*Client]bool),
		Board:   NewBoard(),
	}
}

func (r *Room) Broadcast(message []byte) {

	r.mu.Lock()
	defer r.mu.Unlock()

	for c := range r.Clients {
		c.Send <- message
	}
}



type Room struct {
	ID          string
	Board       *Board
	Players     map[*Client]string // client → color
	Spectators  map[*Client]bool
}

func (r *Room) AddClient(c *Client, color string) {
	if len(r.Players) < 2 {
		r.Players[c] = color
	} else {
		r.Spectators[c] = true
	}
}



func (r *Room) Reconnect(clientID string, conn *websocket.Conn) {

	for c := range r.Players {
		if c.ID == clientID {
			c.Conn = conn
		}
	}
}