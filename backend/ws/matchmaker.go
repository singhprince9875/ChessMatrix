package ws

type Matchmaker struct {
	Queue chan *Client
}

func NewMatchmaker() *Matchmaker {
	return &Matchmaker{
		Queue: make(chan *Client, 100),
	}
}

func (m *Matchmaker) AddPlayer(c *Client) {
	m.Queue <- c
}

func (m *Matchmaker) Start(hub *Hub) {
	for {
		p1 := <-m.Queue
		p2 := <-m.Queue

		room := hub.CreateRoom()

		room.AddClient(p1, "White")
		room.AddClient(p2, "Black")

		room.StartGame()
	}
}
