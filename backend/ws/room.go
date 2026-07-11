package ws

import (
	"sync"

	"chessmatrix/backend/game"
	"github.com/gorilla/websocket"
)

type Room struct {
	ID         string
	Clients    map[*Client]bool
	Players    map[*Client]string // client -> color
	Spectators map[*Client]bool
	Game       *game.Game
	mu         sync.Mutex
}

func NewRoom(id string) *Room {
	return &Room{
		ID:         id,
		Clients:    make(map[*Client]bool),
		Players:    make(map[*Client]string),
		Spectators: make(map[*Client]bool),
		Game:       game.NewGame(),
	}
}

func (r *Room) Broadcast(message []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for c := range r.Clients {
		select {
		case c.Send <- message:
		default:
			close(c.Send)
			delete(r.Clients, c)
		}
	}
}

func (r *Room) AddClient(c *Client, color string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Clients[c] = true
	if len(r.Players) < 2 {
		assignedColor := color
		if assignedColor == "" {
			if len(r.Players) == 0 {
				assignedColor = "White"
			} else {
				hasWhite := false
				for _, col := range r.Players {
					if col == "White" {
						hasWhite = true
					}
				}
				if hasWhite {
					assignedColor = "Black"
				} else {
					assignedColor = "White"
				}
			}
		}
		r.Players[c] = assignedColor
		c.Color = assignedColor
	} else {
		r.Spectators[c] = true
	}
}

func (r *Room) Reconnect(clientID string, conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for c := range r.Clients {
		if c.ID == clientID {
			c.Conn = conn
			break
		}
	}
}

func (r *Room) StartGame() {
	r.Broadcast([]byte(`{"status":"game_started"}`))
}
