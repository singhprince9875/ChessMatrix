const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

let currentTurn = 'White';
let board = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

wss.on('connection', (ws) => {
  console.log('Client connected!');
  
  // Send initial board state
  ws.send(JSON.stringify({
    status: 'connected',
    board: board,
    currentTurn: currentTurn
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received move:', data);

      const { fromRow, fromCol, toRow, toCol } = data;
      
      if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
          toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        ws.send(JSON.stringify({ status: 'error', error: 'Invalid coordinates' }));
        return;
      }

      const piece = board[fromRow][fromCol];
      if (!piece) {
        ws.send(JSON.stringify({ status: 'error', error: 'No piece selected' }));
        return;
      }

      // Execute move
      board[toRow][toCol] = piece;
      board[fromRow][fromCol] = '';

      // Switch turn
      currentTurn = currentTurn === 'White' ? 'Black' : 'White';

      // Broadcast update
      const response = JSON.stringify({
        status: 'ok',
        board: board,
        currentTurn: currentTurn
      });

      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(response);
        }
      });

    } catch (err) {
      console.error(err);
      ws.send(JSON.stringify({ status: 'error', error: 'Malformed payload' }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(8080, () => {
  console.log('Mock ChessMatrix WebSocket server running on ws://localhost:8080/ws');
});
