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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>♟ ChessMatrix Mobile</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Status: {status}</Text>
          <Text style={styles.statusText}>Turn: {turn}</Text>
        </View>
      </View>

      <View style={styles.boardContainer}>
        {board.length > 0 ? (
          board.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((cell, cIdx) => {
                const isDark = (rIdx + cIdx) % 2 === 1;
                const cellBg = isDark ? "#3b2f2f" : "#d8c0b0";
                const isPieceWhite = cell && cell === cell.toUpperCase();

                return (
                  <View
                    key={cIdx}
                    style={[styles.cell, { backgroundColor: cellBg }]}
                  >
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
                  </View>
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
  },
  piece: {
    fontSize: 24,
  },
  loadingText: {
    color: "#aaa",
    padding: 20,
  },
});
