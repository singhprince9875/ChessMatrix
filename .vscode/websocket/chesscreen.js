import { useEffect, useState } from "react";
import { View, Text } from "react-native";

const socket = new WebSocket("ws://your-server/ws");

export default function ChessScreen() {

  const [board, setBoard] = useState([]);

  useEffect(() => {

    socket.onmessage = (msg) => {
      setBoard(JSON.parse(msg.data));
    };

  }, []);

  return (
    <View>
      <Text>Chess Game</Text>

      {board.map((row, i) => (
        <View key={i} style={{ flexDirection: "row" }}>
          {row.map((cell, j) => (
            <Text key={j}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}