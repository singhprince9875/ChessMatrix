export default function ChessBoard({ board }) {

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 50px)" }}>
      {board.flat().map((cell, i) => (
        <div
          key={i}
          style={{
            width: 50,
            height: 50,
            border: "1px solid black",
            textAlign: "center",
            lineHeight: "50px"
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

import React, { useState } from "react";

const initialBoard = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

export default function ChessBoard() {
  const [board, setBoard] = useState(initialBoard);
  const [dragPiece, setDragPiece] = useState(null);

  // ---------------- DRAG START ----------------
  function handleDragStart(piece, row, col) {
    if (!piece) return;

    setDragPiece({
      piece,
      from: { row, col },
    });
  }

  // ---------------- DROP ----------------
  function handleDrop(toRow, toCol) {
    if (!dragPiece) return;

    const newBoard = board.map(row => [...row]);

    const { piece, from } = dragPiece;

    // basic move (frontend only)
    newBoard[from.row][from.col] = "";
    newBoard[toRow][toCol] = piece;

    setBoard(newBoard);
    setDragPiece(null);

    // 👉 SEND TO BACKEND (WebSocket ready)
    sendMoveToServer(from.row, from.col, toRow, toCol);
  }

  // ---------------- WEB SOCKET HOOK ----------------
  function sendMoveToServer(fr, fc, tr, tc) {
    console.log("Sending move:", fr, fc, tr, tc);

    // Example:
    // socket.send(JSON.stringify({
    //   fromRow: fr,
    //   fromCol: fc,
    //   toRow: tr,
    //   toCol: tc
    // }));
  }

  // ---------------- RENDER CELL ----------------
  function renderCell(piece, row, col) {
    return (
      <div
        key={`${row}-${col}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(row, col)}
        style={{
          width: "60px",
          height: "60px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "20px",
          backgroundColor: (row + col) % 2 === 0 ? "#f0d9b5" : "#b58863",
        }}
      >
        {piece && (
          <span
            draggable
            onDragStart={() => handleDragStart(piece, row, col)}
            style={{ cursor: "grab" }}
          >
            {piece}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>♟ Chess Board (Drag & Drop)</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 60px)",
          width: "fit-content",
          border: "2px solid black",
        }}
      >
        {board.map((row, r) =>
          row.map((piece, c) => renderCell(piece, r, c))
        )}
      </div>
    </div>
  );
}