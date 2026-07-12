import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";

const pieceSymbols = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

export default function ChessScreen() {
  const [board, setBoard] = useState([]);
  const [turn, setTurn] = useState("White");
  const [status, setStatus] = useState("Disconnected");
  const [selectedCell, setSelectedCell] = useState(null);
  const [error, setError] = useState("");
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to local backend websocket server (using lobby room)
    const socket = new WebSocket("ws://10.0.2.2:8080/ws?room=lobby"); // 10.0.2.2 resolves to localhost in android emulators

    socket.onopen = () => {
      setStatus("Connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "error" && data.error) {
          setError(data.error);
          // Auto-clear error after 3 seconds
          setTimeout(() => {
            setError("");
          }, 3000);
        } else {
          setError("");
        }

        if (data.board) {
          setBoard(data.board);
        }
        if (data.currentTurn) {
          setTurn(data.currentTurn);
        }
      } catch (err) {
        console.log("Error parsing websocket message:", err);
      }
    };

    socket.onerror = () => {
      setStatus("Connection Error");
    };

    socket.onclose = () => {
      setStatus("Disconnected");
    };

    wsRef.current = socket;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleCellPress = (rIdx, cIdx) => {
    if (selectedCell) {
      // Deselect if tapping the same cell
      if (selectedCell.rIdx === rIdx && selectedCell.cIdx === cIdx) {
        setSelectedCell(null);
        return;
      }

      // Execute move
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const movePayload = {
          fromRow: selectedCell.rIdx,
          fromCol: selectedCell.cIdx,
          toRow: rIdx,
          toCol: cIdx
        };
        wsRef.current.send(JSON.stringify(movePayload));
      }
      setSelectedCell(null);
    } else {
      // Select cell if there is a piece on it
      const piece = board[rIdx]?.[cIdx];
      if (piece) {
        setSelectedCell({ rIdx, cIdx });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>♟ ChessMatrix Mobile</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Status: {status}</Text>
          <Text style={styles.statusText}>Turn: {turn}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <View style={styles.boardContainer}>
        {board.length > 0 ? (
          board.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((cell, cIdx) => {
                const isDark = (rIdx + cIdx) % 2 === 1;
                const cellBg = isDark ? "#3b2f2f" : "#d8c0b0";
                const isPieceWhite = cell && cell === cell.toUpperCase();
                const isSelected = selectedCell && selectedCell.rIdx === rIdx && selectedCell.cIdx === cIdx;

                return (
                  <TouchableOpacity
                    key={cIdx}
                    activeOpacity={0.8}
                    onPress={() => handleCellPress(rIdx, cIdx)}
                    style={[styles.cell, { backgroundColor: cellBg }]}
                  >
                    {isSelected ? <View style={styles.selectedHighlight} /> : null}
                    {cell ? (
                      <Text
                        style={[
                          styles.piece,
                          { color: isPieceWhite ? "#f9f9f9" : "#1a1a1a" }
                        ]}
                      >
                        {pieceSymbols[cell] || cell}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <Text style={styles.loadingText}>Waiting for board state...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e0a96d",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 280,
  },
  statusText: {
    fontSize: 14,
    color: "#aaa",
  },
  errorContainer: {
    backgroundColor: "#d9534f",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  errorText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  boardContainer: {
    borderWidth: 4,
    borderColor: "#2e1d1d",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  selectedHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 224, 85, 0.4)",
  },
  piece: {
    fontSize: 24,
  },
  loadingText: {
    color: "#aaa",
    padding: 20,
  },
});
