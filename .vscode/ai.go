package main

import "math"

// simple evaluation
func evaluateBoard(b *Board) int {

	score := 0

	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {

			p := b.Grid[r][c]

			if p == nil {
				continue
			}

			value := getPieceValue(p.Name)

			if p.Color == "White" {
				score += value
			} else {
				score -= value
			}
		}
	}

	return score
}

func getPieceValue(name string) int {

	switch name {
	case "Pawn":
		return 10
	case "Knight", "Bishop":
		return 30
	case "Rook":
		return 50
	case "Queen":
		return 90
	case "King":
		return 900
	}
	return 0
}





func minimax(b *Board, depth int, isMax bool) int {

	if depth == 0 {
		return evaluateBoard(b)
	}

	if isMax {

		best := math.MinInt32

		moves := generateMoves(b, "White")

		for _, m := range moves {

			clone, _ := SimulateMove(b, m.FromRow, m.FromCol, m.ToRow, m.ToCol)

			score := minimax(clone, depth-1, false)

			if score > best {
				best = score
			}
		}

		return best

	} else {

		best := math.MaxInt32

		moves := generateMoves(b, "Black")

		for _, m := range moves {

			clone, _ := SimulateMove(b, m.FromRow, m.FromCol, m.ToRow, m.ToCol)

			score := minimax(clone, depth-1, true)

			if score < best {
				best = score
			}
		}

		return best
	}
}






func FindBestMove(b *Board, color string, depth int) Move {

	bestScore := math.MinInt32
	var bestMove Move

	moves := GetAllMoves(&Game{Board: b}, color)

	for _, m := range moves {

		clone, _ := SimulateMove(b, m.FromRow, m.FromCol, m.ToRow, m.ToCol)

		score := minimax(clone, depth-1, false)

		if score > bestScore {
			bestScore = score
			bestMove = m
		}
	}

	return bestMove
}