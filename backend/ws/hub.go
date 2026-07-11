package ws

import (
	"fmt"
	"sync"
)

type Hub struct {
	mu    sync.RWMutex
	Rooms map[string]*Room
}

func NewHub() *Hub {
	return &Hub{
		Rooms: make(map[string]*Room),
	}
}

func (h *Hub) GetRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.Rooms[id]
	if !exists {
		room = NewRoom(id)
		h.Rooms[id] = room
	}

	return room
}

func (h *Hub) CreateRoom() *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	id := fmt.Sprintf("room_%d", len(h.Rooms)+1)
	room := NewRoom(id)
	h.Rooms[id] = room
	return room
}
