package game

// IsCheckmate returns true if the given color is checkmated
func IsCheckmate(g *Game, color string) bool {
	// Step 1: King must be in check
	if !g.IsKingInDanger(color) {
		return false
	}

	// Step 2: Try all possible moves for this color
	for r1 := 0; r1 < 8; r1++ {
		for c1 := 0; c1 < 8; c1++ {
			piece := g.Board.Grid[r1][c1]
			if piece == nil || piece.Color != color {
				continue
			}

			// Try all destination squares
			for r2 := 0; r2 < 8; r2++ {
				for c2 := 0; c2 < 8; c2++ {
					// Skip same position
					if r1 == r2 && c1 == c2 {
						continue
					}

					// Validate move using your rules engine
					if !IsValidMove(g.Board, piece, r1, c1, r2, c2) {
						continue
					}

					// Step 3: simulate move on a cloned board
					tempBoard := g.Board.Clone()
					tempGame := &Game{
						Board:       tempBoard,
						CurrentTurn: color,
					}

					_, err := tempGame.Board.MovePiece(r1, c1, r2, c2)
					if err != nil {
						continue
					}

					// If king is SAFE after move → NOT checkmate
					if !tempGame.IsKingInDanger(color) {
						return false
					}
				}
			}
		}
	}

	// If no move saves king → CHECKMATE
	return true
}
