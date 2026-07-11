const { WebSocketServer } = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

// Room database inside memory
const rooms = {};

function getOrCreateRoom(roomID) {
  if (!rooms[roomID]) {
    rooms[roomID] = {
      id: roomID,
      board: [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        ["p", "p", "p", "p", "p", "p", "p", "p"],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["P", "P", "P", "P", "P", "P", "P", "P"],
        ["R", "N", "B", "Q", "K", "B", "N", "R"],
      ],
      currentTurn: 'White',
      players: {
        white: null,
        black: null,
      },
      clients: new Set(),
    };
  }
  return rooms[roomID];
}

wss.on('connection', (ws, request) => {
  const parsedUrl = url.parse(request.url, true);
  const roomID = parsedUrl.query.room || 'lobby';
  const username = parsedUrl.query.username || 'Guest_' + Math.floor(Math.random() * 1000);

  const room = getOrCreateRoom(roomID);
  room.clients.add(ws);
  ws.roomID = roomID;
  ws.username = username;

  // Assign side color if vacant
  if (!room.players.white) {
    room.players.white = username;
    ws.side = 'White';
  } else if (!room.players.black && room.players.white !== username) {
    room.players.black = username;
    ws.side = 'Black';
  } else {
    ws.side = room.players.white === username ? 'White' : (room.players.black === username ? 'Black' : 'Spectator');
  }

  console.log(`User "${username}" joined room "${roomID}" as ${ws.side}`);

  // Send initial board state and active player names
  ws.send(JSON.stringify({
    status: 'connected',
    board: room.board,
    currentTurn: room.currentTurn,
    side: ws.side,
    players: room.players,
  }));

  // Broadcast to other room members that players changed
  broadcastToRoom(roomID, JSON.stringify({
    status: 'players_updated',
    board: room.board,
    currentTurn: room.currentTurn,
    players: room.players,
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Move request from "${username}" in room "${roomID}":`, data);

      const { fromRow, fromCol, toRow, toCol } = data;
      
      if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
          toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        ws.send(JSON.stringify({ status: 'error', error: 'Invalid coordinates' }));
        return;
      }

      const piece = room.board[fromRow][fromCol];
      if (!piece) {
        ws.send(JSON.stringify({ status: 'error', error: 'No piece selected' }));
        return;
      }

      // Turn checking
      const isPieceWhite = piece === piece.toUpperCase();
      if ((isPieceWhite && room.currentTurn !== 'White') || (!isPieceWhite && room.currentTurn !== 'Black')) {
        ws.send(JSON.stringify({ status: 'error', error: `It is ${room.currentTurn}'s turn!` }));
        return;
      }

      // Security check (only play your own color)
      if (ws.side !== 'Spectator' && ws.side !== 'Both') {
        if ((isPieceWhite && ws.side !== 'White') || (!isPieceWhite && ws.side !== 'Black')) {
          ws.send(JSON.stringify({ status: 'error', error: `You are playing as ${ws.side}!` }));
          return;
        }
      }

      // Execute move
      room.board[toRow][toCol] = piece;
      room.board[fromRow][fromCol] = '';

      // Switch turn
      room.currentTurn = room.currentTurn === 'White' ? 'Black' : 'White';

      // Broadcast update to all clients in the room
      const response = JSON.stringify({
        status: 'ok',
        board: room.board,
        currentTurn: room.currentTurn,
        players: room.players,
      });

      broadcastToRoom(roomID, response);

    } catch (err) {
      console.error(err);
      ws.send(JSON.stringify({ status: 'error', error: 'Malformed payload' }));
    }
  });

  ws.on('close', () => {
    console.log(`User "${username}" left room "${roomID}"`);
    room.clients.delete(ws);

    // Free up color seats if they left
    if (room.players.white === username) {
      room.players.white = null;
    } else if (room.players.black === username) {
      room.players.black = null;
    }

    // Attempt to fill seats from remaining connections in room
    for (let client of room.clients) {
      if (!room.players.white && client.username !== room.players.black) {
        room.players.white = client.username;
        client.side = 'White';
        client.send(JSON.stringify({ status: 'side_assigned', side: 'White' }));
      } else if (!room.players.black && client.username !== room.players.white) {
        room.players.black = client.username;
        client.side = 'Black';
        client.send(JSON.stringify({ status: 'side_assigned', side: 'Black' }));
      }
    }

    // Broadcast update
    broadcastToRoom(roomID, JSON.stringify({
      status: 'players_updated',
      board: room.board,
      currentTurn: room.currentTurn,
      players: room.players,
    }));
  });
});

function broadcastToRoom(roomID, payload) {
  const room = rooms[roomID];
  if (room) {
    room.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }
}

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(8080, () => {
  console.log('Mock ChessMatrix WebSocket server running on ws://localhost:8080/ws');
});
