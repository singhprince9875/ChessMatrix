import React, { useState, useEffect, useRef } from "react";

// Piece Unicode character mapping
const pieceSymbols = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

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

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessBoard() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // App Navigation state: "lobby" | "playing" | "analysis"
  const [screenState, setScreenState] = useState("lobby");

  // Game state
  const [board, setBoard] = useState(initialBoard);
  const [currentTurn, setCurrentTurn] = useState("White");
  const [dragPiece, setDragPiece] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [roomID, setRoomID] = useState("lobby");
  const [playerSide, setPlayerSide] = useState("Both"); // "Both" | "White" | "Black" | "Spectator"
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  
  // Game metrics & history
  const [pgnMoves, setPgnMoves] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]); 
  const [capturedBlack, setCapturedBlack] = useState([]); 
  const [whiteTime, setWhiteTime] = useState(600); 
  const [blackTime, setBlackTime] = useState(600);
  const [roomPlayers, setRoomPlayers] = useState({ white: null, black: null });
  const [gameResult, setGameResult] = useState({ won: true, ELO: 15, rating: 2450, reason: "Victory", opponent: "Grandmaster_K" });

  // Matchmaking lobby states
  const [selectedTimeControl, setSelectedTimeControl] = useState("10m");
  const [isSearching, setIsSearching] = useState(false);
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [matchCountdown, setMatchCountdown] = useState(8);
  const [activeTab, setActiveTab] = useState("history"); 

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatList, setChatList] = useState([
    { sender: "System", text: "Welcome to Grandmaster Elite Chat!" }
  ]);

  const socketRef = useRef(null);
  const searchTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Load user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // Manage WebSockets
  useEffect(() => {
    if (screenState === "playing" && currentUser) {
      connectWebSocket(roomID);
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [screenState, roomID, currentUser]);

  // Game Clock Timers
  useEffect(() => {
    let clockInterval = null;
    if (screenState === "playing" && connectionStatus === "Connected") {
      clockInterval = setInterval(() => {
        if (currentTurn === "White") {
          setWhiteTime((prev) => (prev > 0 ? prev - 1 : 0));
        } else {
          setBlackTime((prev) => (prev > 0 ? prev - 1 : 0));
        }
      }, 1000);
    }
    return () => {
      if (clockInterval) clearInterval(clockInterval);
    };
  }, [screenState, connectionStatus, currentTurn]);

  // Auto-resign on timeout
  useEffect(() => {
    if (whiteTime === 0) {
      triggerGameOver("Black", "Timeout");
    }
  }, [whiteTime]);

  useEffect(() => {
    if (blackTime === 0) {
      triggerGameOver("White", "Timeout");
    }
  }, [blackTime]);

  // Matchmaking countdown effect
  useEffect(() => {
    if (showMatchOverlay) {
      setMatchCountdown(8);
      countdownIntervalRef.current = setInterval(() => {
        setMatchCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            acceptMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showMatchOverlay]);

  // WebSocket Connection
  function connectWebSocket(room) {
    setConnectionStatus("Connecting...");
    setErrorMsg("");

    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const wsBaseUrl = import.meta.env.VITE_WS_URL || (isLocal ? "ws://localhost:8080/ws" : "wss://chessmatrix-backend.onrender.com/ws");
    const wsUrl = `${wsBaseUrl}?room=${room}&username=${usernameParam}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus("Connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "ok" || data.status === "connected" || data.status === "players_updated") {
          setBoard(data.board);
          setCurrentTurn(data.currentTurn);
          setErrorMsg("");
          if (data.players) {
            setRoomPlayers(data.players);
          }
          if (data.side) {
            setPlayerSide(data.side);
          }
          if (data.status === "ok" || data.status === "players_updated") {
            scanCapturedPieces(data.board);
          }
        } else if (data.status === "side_assigned") {
          setPlayerSide(data.side);
        } else if (data.status === "error") {
          setErrorMsg(data.error || "Invalid move");
          if (data.board) {
            setBoard(data.board);
          }
        } else if (data.status === "game_started") {
          setErrorMsg("Game has started!");
        }
      } catch (err) {
        console.error("Error parsing message from server:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("Error");
      setErrorMsg("Failed to connect to backend server. Running offline.");
    };

    ws.onclose = () => {
      setConnectionStatus("Disconnected");
    };

    socketRef.current = ws;
  }

  // Auth Submit Handlers
  function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");

    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("All fields are required.");
      return;
    }

    const accounts = JSON.parse(localStorage.getItem("accounts") || "[]");

    if (authMode === "signup") {
      const exists = accounts.find(acc => acc.username.toLowerCase() === authUsername.toLowerCase());
      if (exists) {
        setAuthError("Username already exists.");
        return;
      }

      const newUser = {
        username: authUsername.trim(),
        password: authPassword,
        elo: 2400
      };

      accounts.push(newUser);
      localStorage.setItem("accounts", JSON.stringify(accounts));
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      setCurrentUser(newUser);
      setAuthUsername("");
      setAuthPassword("");
    } else {
      const user = accounts.find(
        acc => acc.username.toLowerCase() === authUsername.toLowerCase() && acc.password === authPassword
      );

      if (!user) {
        setAuthError("Invalid username or password.");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(user));
      setCurrentUser(user);
      setAuthUsername("");
      setAuthPassword("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setScreenState("lobby");
  }

  // Count captured pieces compared to typical starting set
  function scanCapturedPieces(newBoard) {
    const defaultCounts = {
      'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1,
      'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1
    };
    const currentCounts = {
      'P': 0, 'R': 0, 'N': 0, 'B': 0, 'Q': 0,
      'p': 0, 'r': 0, 'n': 0, 'b': 0, 'q': 0
    };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = newBoard[r][c];
        if (p && p !== 'K' && p !== 'k') {
          currentCounts[p] = (currentCounts[p] || 0) + 1;
        }
      }
    }

    const whiteCap = [];
    const blackCap = [];
    ['P', 'R', 'N', 'B', 'Q'].forEach(p => {
      const diff = defaultCounts[p] - currentCounts[p];
      for (let i = 0; i < diff; i++) whiteCap.push(p);
    });
    ['p', 'r', 'n', 'b', 'q'].forEach(p => {
      const diff = defaultCounts[p] - currentCounts[p];
      for (let i = 0; i < diff; i++) blackCap.push(p);
    });

    setCapturedWhite(whiteCap);
    setCapturedBlack(blackCap);
  }

  function checkTurn(piece) {
    const isPieceWhite = piece === piece.toUpperCase();
    if (isPieceWhite && currentTurn !== "White") {
      setErrorMsg("It is Black's turn!");
      return false;
    }
    if (!isPieceWhite && currentTurn !== "Black") {
      setErrorMsg("It is White's turn!");
      return false;
    }
    if (playerSide !== "Spectator" && playerSide !== "Both") {
      if (isPieceWhite && playerSide !== "White") {
        setErrorMsg("You are playing as Black!");
        return false;
      }
      if (!isPieceWhite && playerSide !== "Black") {
        setErrorMsg("You are playing as White!");
        return false;
      }
    }
    return true;
  }

  function sendMoveToServer(fromRow, fromCol, toRow, toCol) {
    const moveStr = `${files[fromCol]}${ranks[fromRow]} → ${files[toCol]}${ranks[toRow]}`;
    
    // Add to PGN moves log
    setPgnMoves(prev => {
      const copy = [...prev];
      if (copy.length === 0 || copy[copy.length - 1].black !== null) {
        copy.push({ index: copy.length + 1, white: moveStr, black: null });
      } else {
        copy[copy.length - 1].black = moveStr;
      }
      return copy;
    });

    // Offline simulation if server offline
    if (connectionStatus !== "Connected") {
      const targetPiece = board[fromRow][fromCol];
      const updated = board.map(row => [...row]);
      updated[toRow][toCol] = targetPiece;
      updated[fromRow][fromCol] = "";
      setBoard(updated);
      setCurrentTurn(currentTurn === "White" ? "Black" : "White");
      scanCapturedPieces(updated);
      return;
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ fromRow, fromCol, toRow, toCol })
      );
    }
  }

  // ---------------- DRAG AND DROP ----------------
  function handleDragStart(piece, row, col) {
    if (!piece) return;
    if (!checkTurn(piece)) return;
    setDragPiece({ piece, from: { row, col } });
    setErrorMsg("");
  }

  function handleDrop(toRow, toCol) {
    if (!dragPiece) return;
    const { from } = dragPiece;
    if (from.row === toRow && from.col === toCol) {
      setDragPiece(null);
      return;
    }
    sendMoveToServer(from.row, from.col, toRow, toCol);
    setDragPiece(null);
  }

  // ---------------- CLICK TO MOVE ----------------
  function handleCellClick(row, col) {
    const piece = board[row][col];

    if (selectedCell) {
      if (selectedCell.row === row && selectedCell.col === col) {
        setSelectedCell(null);
        return;
      }
      
      if (piece) {
        const isPieceWhite = piece === piece.toUpperCase();
        const isPieceOfCurrentTurn = (isPieceWhite && currentTurn === "White") || (!isPieceWhite && currentTurn === "Black");
        
        if (isPieceOfCurrentTurn && checkTurn(piece)) {
          setSelectedCell({ row, col });
          setErrorMsg("");
          return;
        }
      }

      sendMoveToServer(selectedCell.row, selectedCell.col, row, col);
      setSelectedCell(null);
    } else {
      if (piece) {
        if (!checkTurn(piece)) return;
        setSelectedCell({ row, col });
        setErrorMsg("");
      }
    }
  }

  // ---------------- MATCHMAKING QUEUE ----------------
  function startQueue() {
    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      setIsSearching(false);
      setShowMatchOverlay(true);
    }, 3000);
  }

  function cancelQueue() {
    setIsSearching(false);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }

  function acceptMatch() {
    setShowMatchOverlay(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setBoard(initialBoard);
    setWhiteTime(600);
    setBlackTime(600);
    setPgnMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setScreenState("playing");
  }

  function declineMatch() {
    setShowMatchOverlay(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }

  function triggerGameOver(winnerSide, reason) {
    const won = playerSide === winnerSide;
    const eloChange = won ? 15 : -10;
    
    // Update ELO rating local storage
    if (currentUser) {
      const updatedUser = { ...currentUser, elo: currentUser.elo + eloChange };
      setCurrentUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      
      const accounts = JSON.parse(localStorage.getItem("accounts") || "[]");
      const index = accounts.findIndex(acc => acc.username.toLowerCase() === currentUser.username.toLowerCase());
      if (index !== -1) {
        accounts[index].elo = updatedUser.elo;
        localStorage.setItem("accounts", JSON.stringify(accounts));
      }
    }

    setGameResult({
      won: won,
      ELO: eloChange,
      rating: currentUser ? currentUser.elo + eloChange : 2400,
      reason: won ? "Victory" : "Defeat",
      opponent: playerSide === "White" 
        ? (roomPlayers.black || "Opponent") 
        : (roomPlayers.white || "Opponent")
    });
    setScreenState("analysis");
  }

  function handleSendMessage() {
    if (!chatMessage.trim()) return;
    setChatList(prev => [...prev, { sender: "You", text: chatMessage }]);
    setChatMessage("");
    
    setTimeout(() => {
      const opponentName = playerSide === "White" ? (roomPlayers.black || "Opponent") : (roomPlayers.white || "Opponent");
      setChatList(prev => [...prev, { sender: opponentName, text: "Good move! Let's keep playing." }]);
    }, 2000);
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function renderChessSquare(piece, row, col) {
    const isDarkCell = (row + col) % 2 === 1;
    const isPieceWhite = piece && piece === piece.toUpperCase();
    const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;

    return (
      <div
        key={`${row}-${col}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(row, col)}
        onClick={() => handleCellClick(row, col)}
        className={`chess-square flex items-center justify-center relative transition-all duration-300 cursor-pointer ${
          isSelected 
            ? "bg-primary/40 outline outline-3 outline-primary -outline-offset-3" 
            : (isDarkCell ? "bg-board-dark" : "bg-board-light")
        }`}
      >
        {piece && (
          <span
            draggable
            onDragStart={() => handleDragStart(piece, row, col)}
            style={{
              color: isPieceWhite ? "#f9f9f9" : "#1a1a1a",
              textShadow: isPieceWhite
                ? "1px 1px 2px #000, 0 0 1px #000"
                : "1px 1px 2px #fff, 0 0 1px #fff",
              cursor: "pointer",
            }}
            className="material-symbols-outlined text-4xl lg:text-5xl select-none drop-shadow-lg transition-transform hover:scale-110"
          >
            {pieceSymbols[piece] || piece}
          </span>
        )}
      </div>
    );
  }

  // Reverse mapping calculations
  const isFlipped = playerSide === "Black";
  const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // If not logged in, show beautiful auth portal screen
  if (!currentUser) {
    return (
      <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen relative flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-6xl text-primary mb-2 gold-glow">chess</span>
            <h1 className="font-headline-lg text-headline-lg text-white">Grandmaster Elite</h1>
            <p className="text-on-surface-variant text-sm mt-1">Enter the royal arena of chess experts</p>
          </div>

          <div className="flex border-b border-white/10 mb-6">
            <button 
              onClick={() => { setAuthMode("signin"); setAuthError(""); }}
              className={`flex-1 pb-3 font-label-md text-center transition-all ${authMode === "signin" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant"}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode("signup"); setAuthError(""); }}
              className={`flex-1 pb-3 font-label-md text-center transition-all ${authMode === "signup" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant"}`}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="bg-danger/10 text-danger border border-danger/20 px-4 py-2 rounded-lg text-sm text-center mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Username</label>
              <input 
                type="text" 
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm"
                placeholder="e.g. Grandmaster_Chen"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-2">Password</label>
              <input 
                type="password" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-primary text-on-primary-container rounded-lg font-headline-lg royal-glow transition-transform active:scale-[0.98] font-bold shadow-lg"
            >
              {authMode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden min-h-screen relative flex flex-col">
      
      {/* HEADER SECTION */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface-panel backdrop-blur-xl border-b border-white/10 shadow-md">
        <div className="flex items-center gap-md">
          <span className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-3 cursor-pointer" onClick={() => setScreenState("lobby")}>
            <span className="material-symbols-outlined text-4xl">chess</span>
            <span>Grandmaster Elite</span>
          </span>
          <nav className="hidden lg:flex items-center gap-lg ml-xl">
            <button className={`font-label-md text-label-md py-xs transition-colors ${screenState === "playing" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"}`} onClick={() => setScreenState("playing")}>Play</button>
            <button className={`font-label-md text-label-md py-xs transition-colors ${screenState === "analysis" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"}`} onClick={() => setScreenState("analysis")}>Analysis</button>
            <button className={`font-label-md text-label-md py-xs transition-colors ${screenState === "lobby" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"}`} onClick={() => setScreenState("lobby")}>Lobby</button>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <span className="text-sm font-label-md text-white mr-2">Hello, {currentUser.username}</span>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">notifications</button>
          <button onClick={handleLogout} className="material-symbols-outlined text-on-surface-variant hover:text-danger transition-colors cursor-pointer" title="Logout">logout</button>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-primary/30">
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
              {currentUser.username[0]}
            </div>
          </div>
        </div>
      </header>

      {/* MATCHMAKING / LOBBY SCREEN */}
      {screenState === "lobby" && (
        <div className="flex-1 flex flex-col lg:flex-row pt-24 px-gutter pb-8 max-w-7xl mx-auto w-full gap-gutter">
          <div className="flex-grow lg:w-8/12 space-y-gutter">
            
            {/* Matchmaking selection panel */}
            <section className="glass-panel rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <h2 className="font-headline-lg text-headline-lg text-white mb-2">Find a Match</h2>
              <p className="text-on-surface-variant font-body-md mb-8">Select your preferred time control and enter the arena.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { id: "10m", title: "10m", type: "Rapid", sub: "+5s inc" },
                  { id: "15m", title: "15m", type: "Rapid", sub: "+10s inc" },
                  { id: "30m", title: "30m", type: "Classical", sub: "No inc" },
                  { id: "60m", title: "60m", type: "Grand", sub: "+30s delay" },
                ].map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedTimeControl(tc.id)}
                    className={`time-control-card glass-panel rounded-lg p-4 text-center border-t transition-all hover:scale-[1.02] ${
                      selectedTimeControl === tc.id 
                        ? "border-primary/60 bg-primary/10 shadow-lg" 
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className={`block font-headline-lg ${selectedTimeControl === tc.id ? "text-primary" : "text-white"}`}>{tc.title}</span>
                    <span className="text-on-surface-variant font-label-sm">{tc.type}</span>
                    <span className={`block text-[10px] mt-1 ${selectedTimeControl === tc.id ? "text-primary/60" : "text-on-surface-variant/60"}`}>{tc.sub}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isSearching ? (
                  <button onClick={cancelQueue} className="flex-grow bg-surface-container-highest text-primary py-5 rounded-lg font-headline-lg flex items-center justify-center gap-3 transition-transform active:scale-95 group border border-primary/20">
                    <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                    SEARCHING... (Click to Cancel)
                  </button>
                ) : (
                  <button onClick={startQueue} className="flex-grow bg-primary text-on-primary-container py-5 rounded-lg font-headline-lg royal-glow royal-glow-hover flex items-center justify-center gap-3 transition-transform active:scale-95 group">
                    <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">swords</span>
                    PLAY NOW
                  </button>
                )}
                
                <div className="flex items-center gap-2">
                  <select
                    value={playerSide}
                    onChange={(e) => {
                      setPlayerSide(e.target.value);
                      setSelectedCell(null);
                    }}
                    className="bg-surface-container border border-white/10 text-white rounded-lg px-4 py-5 font-title-md outline-none cursor-pointer h-full text-sm"
                  >
                    <option value="Both">Play Both Sides (Local)</option>
                    <option value="White">Play as White</option>
                    <option value="Black">Play as Black</option>
                    <option value="Spectator">Spectator Only</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Room Host custom config */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-title-md text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">add_box</span>
                  Create Room
                </h3>
                <p className="text-on-surface-variant font-label-md mb-6">Host a private game with custom rules and invite specific players.</p>
                <div className="flex gap-2">
                  <input 
                    className="bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary flex-grow font-mono"
                    type="text" 
                    value={roomID} 
                    onChange={(e) => setRoomID(e.target.value)} 
                    placeholder="Room ID"
                  />
                  <button onClick={() => setScreenState("playing")} className="bg-surface-container-highest px-4 rounded-lg text-primary hover:bg-white/10 transition-all font-label-md">
                    Host
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6">
                <h3 className="font-title-md text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">key</span>
                  Join with Code
                </h3>
                <div className="flex gap-2">
                  <input 
                    className="bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary flex-grow" 
                    placeholder="Enter Room Code" 
                    type="text"
                    value={roomID}
                    onChange={(e) => setRoomID(e.target.value)}
                  />
                  <button onClick={() => setScreenState("playing")} className="bg-surface-container-highest px-4 rounded-lg text-primary hover:bg-white/10 transition-all">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Watch spectator channels */}
            <section className="glass-panel rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-title-md text-white">Live Spectator Lobby</h3>
                <span className="text-primary font-label-sm flex items-center gap-1 hover:underline cursor-pointer">
                  View All <span className="material-symbols-outlined text-sm">open_in_new</span>
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { opponent: "Kasparov_Fan vs DeepBlue_v2", type: "High Stakes", count: "354 Spectators" },
                  { opponent: "BlitzKing vs MagnusJr", type: "Rapid", count: "120 Spectators" },
                ].map((game, i) => (
                  <div key={i} onClick={() => { setPlayerSide("Spectator"); setScreenState("playing"); }} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                    <div>
                      <p className="text-white font-label-md">{game.opponent}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{game.type} • {game.count}</p>
                    </div>
                    <button className="px-4 py-2 bg-primary/10 text-primary text-xs rounded-full font-bold">WATCH</button>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Friends side roster */}
          <div className="lg:w-4/12 flex-grow space-y-gutter">
            <section className="glass-panel rounded-xl flex flex-col h-full max-h-[700px]">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-title-md text-white">Friends Online</h3>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">3 / 48</span>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {[
                  { name: "MasterOfKnights", status: "In Lobby", color: "success" },
                  { name: "Checkmate_Gal", status: "Playing (15:20 left)", color: "warning" },
                  { name: "EnPassant_Expert", status: "In Lobby", color: "success" },
                ].map((friend, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all group cursor-pointer">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-primary/20 flex items-center justify-center text-primary font-bold text-sm uppercase">
                        {friend.name[0]}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-surface-elevated rounded-full bg-${friend.color}`}></div>
                    </div>
                    <div className="flex-grow">
                      <p className="text-white font-label-md leading-tight">{friend.name}</p>
                      <p className={`text-[10px] leading-tight ${friend.color === "success" ? "text-success" : "text-warning"}`}>{friend.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/5">
                <button className="w-full flex items-center justify-center gap-2 py-3 text-on-surface-variant font-label-md hover:text-white transition-all">
                  <span className="material-symbols-outlined">group_add</span>
                  Invite More Friends
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* MATCH POP DIALOGUE */}
      {showMatchOverlay && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-10 text-center relative overflow-hidden animate-match-found">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
            <div className="mb-8">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 royal-glow shadow-[0_0_50px_rgba(240,191,92,0.4)]">
                <span className="material-symbols-outlined text-5xl text-on-primary">priority_high</span>
              </div>
              <h2 className="font-headline-xl text-primary mb-2">MATCH FOUND!</h2>
              <p className="text-white text-lg">Opponent: <span className="font-bold">Grandmaster_K</span> (2510 ELO)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase text-on-surface-variant mb-1">Time Control</p>
                <p className="text-xl font-bold text-white">10 + 5</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase text-on-surface-variant mb-1">Your Color</p>
                <p className="text-xl font-bold text-white">{playerSide === "Both" ? "White/Black" : playerSide}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={acceptMatch} className="w-full py-4 bg-primary text-on-primary-container rounded-lg font-headline-lg royal-glow transition-all active:scale-95">
                ACCEPT ({matchCountdown}s)
              </button>
              <button onClick={declineMatch} className="w-full py-3 text-danger font-label-md hover:bg-danger/10 rounded-lg transition-all">
                Decline
              </button>
            </div>

            <div className="mt-8 flex justify-center gap-1">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all ease-linear" 
                  style={{ width: `${(matchCountdown / 8) * 100}%`, transitionDuration: "1000ms" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE GAME SCREEN */}
      {screenState === "playing" && (
        <div className="flex-1 flex pt-16 flex-col lg:flex-row overflow-hidden bg-[#0F1115]">
          
          {/* Left stats sidebar */}
          <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 p-lg bg-surface-container/30 h-full overflow-y-auto custom-scrollbar">
            <div className="glass-panel p-md rounded-xl mb-lg">
              <h3 className="font-label-md text-primary mb-sm uppercase tracking-wider">Captured Pieces</h3>
              <div className="flex flex-col gap-md">
                <div className="space-y-sm">
                  <p className="text-xs text-on-surface-variant">Opponent ({playerSide === "White" ? "Black" : "White"})</p>
                  <div className="flex flex-wrap gap-xs opacity-80 min-h-[30px]">
                    {playerSide === "White" ? (
                      capturedBlack.map((p, idx) => (
                        <span key={idx} className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {p.toLowerCase() === 'p' ? 'chess' : 'star'}
                        </span>
                      ))
                    ) : (
                      capturedWhite.map((p, idx) => (
                        <span key={idx} className="material-symbols-outlined text-2xl">
                          {p.toUpperCase() === 'P' ? 'chess' : 'star'}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="space-y-sm">
                  <p className="text-xs text-on-surface-variant">You ({playerSide})</p>
                  <div className="flex flex-wrap gap-xs opacity-80 min-h-[30px]">
                    {playerSide === "White" ? (
                      capturedWhite.map((p, idx) => (
                        <span key={idx} className="material-symbols-outlined text-2xl">
                          {p.toUpperCase() === 'P' ? 'chess' : 'star'}
                        </span>
                      ))
                    ) : (
                      capturedBlack.map((p, idx) => (
                        <span key={idx} className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {p.toLowerCase() === 'p' ? 'chess' : 'star'}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-md rounded-xl mb-lg">
              <h3 className="font-label-md text-primary mb-sm uppercase tracking-wider">Game Status</h3>
              <div className="space-y-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Match Room:</span>
                  <span className="text-on-surface font-mono">#{roomID}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Connection:</span>
                  <span className={connectionStatus === "Connected" ? "text-success" : "text-danger"}>{connectionStatus}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Latency:</span>
                  <span className="text-success">24ms</span>
                </div>
              </div>
            </div>

            <div className="mt-auto glass-panel p-md rounded-xl">
              <div className="flex items-center gap-sm">
                <div className="w-10 h-10 rounded-full border border-primary/40 overflow-hidden flex items-center justify-center bg-primary/20 text-primary font-bold">
                  {currentUser.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-label-md text-white">{currentUser.username}</p>
                  <p className="text-xs text-primary">ELO {currentUser.elo}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Center board canvas */}
          <section className="flex-grow flex flex-col items-center justify-center p-md lg:p-xl relative">
            
            {/* Top Opponent details card */}
            <div className="w-full max-w-[600px] flex justify-between items-end mb-md">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg border-2 border-white/10 overflow-hidden bg-surface-container-highest flex items-center justify-center text-white font-bold text-sm uppercase">
                  {playerSide === "White" 
                    ? (roomPlayers.black ? roomPlayers.black[0] : "?") 
                    : (roomPlayers.white ? roomPlayers.white[0] : "?")}
                </div>
                <div>
                  <h2 className="font-title-md text-white">
                    {playerSide === "White" ? (roomPlayers.black || "Waiting for player...") : (roomPlayers.white || "Waiting for player...")}
                  </h2>
                  <p className="text-xs text-on-surface-variant">ELO 2400 • Opponent</p>
                </div>
              </div>
              <div className={`glass-panel px-md py-sm rounded-lg font-mono text-2xl text-on-surface border-l-4 ${currentTurn === (playerSide === "Black" ? "White" : "Black") ? "low-time-glow text-primary border-primary" : "border-white/20"}`}>
                {playerSide === "Black" ? formatTime(whiteTime) : formatTime(blackTime)}
              </div>
            </div>

            {errorMsg && (
              <div className="absolute top-24 w-full max-w-[600px] bg-danger/20 text-danger border border-danger/30 px-4 py-2 rounded-lg text-center z-10 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Chess board rendering */}
            <div className="relative w-full aspect-square max-w-[600px] border-[8px] border-board-border rounded-sm shadow-2xl overflow-hidden">
              <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                {rows.map((r) =>
                  cols.map((c) => renderChessSquare(board[r][c], r, c))
                )}
              </div>
              <div className="absolute bottom-1 right-1 text-[10px] text-board-dark/50 select-none font-bold bg-black/30 px-1 rounded">
                {playerSide === "Black" ? "Flipped" : "Standard"}
              </div>
            </div>

            {/* Bottom player profile card */}
            <div className="w-full max-w-[600px] flex justify-between items-start mt-md">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg border-2 border-primary overflow-hidden bg-primary/20 text-primary font-bold flex items-center justify-center text-sm uppercase">
                  {playerSide === "Black" 
                    ? (roomPlayers.black ? roomPlayers.black[0] : "?") 
                    : (roomPlayers.white ? roomPlayers.white[0] : "?")}
                </div>
                <div>
                  <h2 className="font-title-md text-white">
                    {playerSide === "Black" ? (roomPlayers.black || currentUser.username) : (roomPlayers.white || currentUser.username)}
                  </h2>
                  <p className="text-xs text-primary">ELO {currentUser.elo} • Turn: {currentTurn}</p>
                </div>
              </div>
              <div className={`glass-panel px-md py-sm rounded-lg font-mono text-2xl border-l-4 ${currentTurn === (playerSide === "Black" ? "Black" : "White") ? "low-time-glow text-primary border-primary" : "text-on-surface border-white/20"}`}>
                {playerSide === "Black" ? formatTime(blackTime) : formatTime(whiteTime)}
              </div>
            </div>

          </section>

          {/* Right sidebar - PGN, Chat & Controls */}
          <aside className="hidden lg:flex flex-col w-80 border-l border-white/5 bg-surface-container/30 h-full overflow-hidden">
            <div className="flex border-b border-white/10">
              <button 
                onClick={() => setActiveTab("history")} 
                className={`flex-1 py-md font-label-md transition-all ${activeTab === "history" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-on-surface-variant hover:bg-white/5"}`}
              >
                History
              </button>
              <button 
                onClick={() => setActiveTab("chat")} 
                className={`flex-1 py-md font-label-md transition-all ${activeTab === "chat" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-on-surface-variant hover:bg-white/5"}`}
              >
                Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-md">
              {activeTab === "history" ? (
                <div className="space-y-xs">
                  {pgnMoves.map((m) => (
                    <div key={m.index} className="grid grid-cols-12 gap-sm items-center py-sm px-md rounded-lg bg-white/5">
                      <span className="col-span-2 text-xs text-on-surface-variant">{m.index}.</span>
                      <span className="col-span-5 text-sm font-semibold">{m.white}</span>
                      <span className="col-span-5 text-sm font-semibold">{m.black || "..."}</span>
                    </div>
                  ))}
                  {pgnMoves.length === 0 && (
                    <div className="py-xl flex flex-col items-center opacity-20 select-none">
                      <span className="material-symbols-outlined text-4xl">history</span>
                      <p className="text-xs uppercase tracking-widest mt-sm">No moves recorded</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-sm flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                    {chatList.map((chat, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-white/5 text-sm">
                        <span className="text-xs font-bold text-primary mr-1">{chat.sender}:</span>
                        <span className="text-sm">{chat.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 border-t border-white/10 pt-sm mt-md">
                    <input 
                      type="text" 
                      value={chatMessage} 
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => { if(e.key === "Enter") handleSendMessage(); }}
                      placeholder="Say something..." 
                      className="bg-surface-container border border-white/10 rounded px-2 py-1 text-white text-sm flex-grow outline-none"
                    />
                    <button onClick={handleSendMessage} className="bg-primary text-on-primary-container px-3 py-1 rounded text-xs font-bold">Send</button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-lg grid grid-cols-2 gap-md border-t border-white/10 bg-surface-container-highest">
              <div className="col-span-2 flex flex-col gap-1 mb-2">
                <label className="text-[10px] uppercase text-on-surface-variant font-bold">Your Playing Side</label>
                <select
                  value={playerSide}
                  onChange={(e) => {
                    setPlayerSide(e.target.value);
                    setSelectedCell(null);
                  }}
                  className="w-full bg-surface-container border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
                >
                  <option value="Both">Play Both Sides (Local)</option>
                  <option value="White">Play as White</option>
                  <option value="Black">Play as Black</option>
                  <option value="Spectator">Spectator Only</option>
                </select>
              </div>
              <button onClick={() => triggerGameOver(playerSide === "White" ? "Black" : "White", "Resigned")} className="flex items-center justify-center gap-sm bg-white/5 border border-white/10 py-md rounded-xl hover:bg-white/10 transition-all active:scale-95">
                <span className="material-symbols-outlined text-md">flag</span>
                <span className="text-xs font-label-md">Resign</span>
              </button>
              <button onClick={() => triggerGameOver("Draw", "Agreement")} className="flex items-center justify-center gap-sm bg-white/5 border border-white/10 py-md rounded-xl hover:bg-white/10 transition-all active:scale-95">
                <span className="material-symbols-outlined text-md">handshake</span>
                <span className="text-xs font-label-md">Draw</span>
              </button>
              <button onClick={() => {
                setErrorMsg("Undo request sent to opponent.");
              }} className="col-span-2 flex items-center justify-center gap-sm bg-white/5 border border-white/10 py-md rounded-xl hover:bg-white/10 transition-all active:scale-95">
                <span className="material-symbols-outlined text-md">undo</span>
                <span className="text-xs font-label-md">Request Undo</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MATCH ANALYSIS SCREEN */}
      {screenState === "analysis" && (
        <div className="flex-1 flex items-center justify-center p-4 bg-black/60 pt-20">
          <div className="w-full max-w-3xl glass-panel rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            
            <div className="md:w-5/12 bg-gradient-to-br from-primary/20 via-surface-elevated to-surface-elevated p-10 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-primary"></div>
              </div>
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full"></div>
                <span className="material-symbols-outlined text-8xl text-primary gold-glow" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-primary uppercase tracking-widest gold-glow mb-2">{gameResult.reason}</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">vs. {gameResult.opponent}</p>
              
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center">
                  <span className="text-primary font-headline-lg text-headline-lg font-bold">{gameResult.ELO > 0 ? `+${gameResult.ELO}` : gameResult.ELO} ELO</span>
                  <span className="text-on-surface-variant text-label-sm font-label-sm uppercase tracking-widest">New Rating: {gameResult.rating}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-label-sm font-label-sm">
                    <span className="text-on-surface-variant">XP PROGRESS</span>
                    <span className="text-primary">850 / 1000</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: "85%" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-7/12 p-10 bg-surface-elevated/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-title-md text-title-md text-on-surface border-b border-white/10 pb-2">Match Insights</h2>
                  <span className="text-label-sm font-label-sm text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">94.2% Accuracy</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:border-primary/40 transition-colors">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    </div>
                    <div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant">Brilliant</p>
                      <p className="font-title-md text-title-md text-on-surface">2</p>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:border-primary/40 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant">Best Moves</p>
                      <p className="font-title-md text-title-md text-on-surface">18</p>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:border-primary/40 transition-colors">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                    </div>
                    <div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant">Mistakes</p>
                      <p className="font-title-md text-title-md text-on-surface">1</p>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:border-primary/40 transition-colors">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <span className="material-symbols-outlined text-danger" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    </div>
                    <div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant">Blunders</p>
                      <p className="font-title-md text-title-md text-on-surface">0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setScreenState("lobby")} className="col-span-2 py-4 bg-primary text-on-primary-container font-label-md text-label-md rounded-xl flex items-center justify-center gap-3 button-glow transition-all active:scale-95 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined">replay</span>
                  Play Again
                </button>
                <button onClick={() => { setScreenState("lobby"); startQueue(); }} className="py-3 px-4 border border-primary/40 text-primary font-label-md text-label-md rounded-xl flex items-center justify-center gap-3 hover:bg-primary/10 transition-all active:scale-95">
                  <span className="material-symbols-outlined">add_box</span>
                  New Match
                </button>
                <button onClick={() => alert("Downloading PGN log...")} className="py-3 px-4 border border-white/10 text-on-surface-variant font-label-md text-label-md rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-95">
                  <span className="material-symbols-outlined">download</span>
                  PGN
                </button>
                <button onClick={() => setScreenState("lobby")} className="col-span-2 mt-2 py-2 text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors text-center uppercase tracking-widest flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">home</span>
                  Return Home
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile View) */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex lg:hidden justify-around items-center h-20 pb-safe bg-surface-panel backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <button onClick={() => setScreenState("playing")} className={`flex flex-col items-center justify-center transition-colors ${screenState === "playing" ? "text-primary scale-110" : "text-on-surface-variant hover:text-primary"}`}>
          <span className="material-symbols-outlined">chess</span>
          <span className="font-label-sm text-label-sm">Play</span>
        </button>
        <button onClick={() => setScreenState("lobby")} className={`flex flex-col items-center justify-center transition-colors ${screenState === "lobby" ? "text-primary scale-110" : "text-on-surface-variant hover:text-primary"}`}>
          <span className="material-symbols-outlined">meeting_room</span>
          <span className="font-label-sm text-label-sm">Lobby</span>
        </button>
        <button onClick={() => alert("Social features coming soon!")} className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">diversity_3</span>
          <span className="font-label-sm text-label-sm">Social</span>
        </button>
        <button onClick={() => setScreenState("analysis")} className={`flex flex-col items-center justify-center transition-colors ${screenState === "analysis" ? "text-primary scale-110" : "text-on-surface-variant hover:text-primary"}`}>
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-sm text-label-sm">Profile</span>
        </button>
      </footer>

    </div>
  );
}
