func readPump(c *ws.Client) {

	defer c.Conn.Close()

	for {

		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		// message = move data
		// example: {"from":"e2","to":"e4"}

		result := handleMove(c.Room, msg)

		c.Room.Broadcast(result)
	}
}








func writePump(c *ws.Client) {

	defer c.Conn.Close()

	for msg := range c.Send {
		c.Conn.WriteMessage(websocket.TextMessage, msg)
	}
}