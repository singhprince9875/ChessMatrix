func handleMove(room *ws.Room, msg []byte) []byte {

	// parse JSON move (simplified)
	fromRow, fromCol, toRow, toCol := parseMove(msg)

	game := &Game{
		Board: room.Board,
	}

	err := game.Move(fromRow, fromCol, toRow, toCol)

	if err != nil {
		return []byte(`{"error":"invalid move"}`)
	}

	return []byte(`{"status":"ok","board":"updated"}`)
}