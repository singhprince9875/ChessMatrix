package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"chessmatrix/backend/game"
	"chessmatrix/backend/ws"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type MoveRequest struct {
	FromRow int `json:"fromRow"`
	FromCol int `json:"fromCol"`
	ToRow   int `json:"toRow"`
	ToCol   int `json:"toCol"`
}

type MoveResponse struct {
	Status      string       `json:"status"`
	Board       [8][8]string `json:"board"`
	CurrentTurn string       `json:"currentTurn"`
	Error       string       `json:"error,omitempty"`
}

func generateID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "client_random"
	}
	return hex.EncodeToString(bytes)
}

func ServeWS(hub *ws.Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		roomID = "lobby"
	}
	room := hub.GetRoom(roomID)

	client := &ws.Client{
		ID:   generateID(),
		Conn: conn,
		Send: make(chan []byte, 256),
		Room: room,
	}

	room.AddClient(client, "")

	// Send current board state immediately on connection
	initialState := MoveResponse{
		Status:      "connected",
		Board:       room.Game.Board.Serialize(),
		CurrentTurn: room.Game.CurrentTurn,
	}
	respBytes, _ := json.Marshal(initialState)
	_ = conn.WriteMessage(websocket.TextMessage, respBytes)

	go readPump(client)
	go writePump(client)
}

func readPump(c *ws.Client) {
	defer func() {
		c.Room.mu.Lock()
		delete(c.Room.Clients, c)
		delete(c.Room.Players, c)
		delete(c.Room.Spectators, c)
		c.Room.mu.Unlock()
		c.Conn.Close()
	}()

	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		result := handleMove(c.Room, msg)
		c.Room.Broadcast(result)
	}
}

func writePump(c *ws.Client) {
	defer c.Conn.Close()

	for msg := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			break
		}
	}
}

func parseMove(msg []byte) (int, int, int, int) {
	var req MoveRequest
	if err := json.Unmarshal(msg, &req); err != nil {
		return -1, -1, -1, -1
	}
	return req.FromRow, req.FromCol, req.ToRow, req.ToCol
}

func handleMove(room *ws.Room, msg []byte) []byte {
	fromRow, fromCol, toRow, toCol := parseMove(msg)

	room.mu.Lock()
	defer room.mu.Unlock()

	// Perform validation
	err := game.ValidateServerMove(room.Game, fromRow, fromCol, toRow, toCol)
	if err != nil {
		resp := MoveResponse{
			Status:      "error",
			Board:       room.Game.Board.Serialize(),
			CurrentTurn: room.Game.CurrentTurn,
			Error:       err.Error(),
		}
		respBytes, _ := json.Marshal(resp)
		return respBytes
	}

	err = room.Game.Move(fromRow, fromCol, toRow, toCol)
	if err != nil {
		resp := MoveResponse{
			Status:      "error",
			Board:       room.Game.Board.Serialize(),
			CurrentTurn: room.Game.CurrentTurn,
			Error:       err.Error(),
		}
		respBytes, _ := json.Marshal(resp)
		return respBytes
	}

	resp := MoveResponse{
		Status:      "ok",
		Board:       room.Game.Board.Serialize(),
		CurrentTurn: room.Game.CurrentTurn,
	}
	respBytes, _ := json.Marshal(resp)
	return respBytes
}
