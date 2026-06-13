package main

// SimulateMove creates a safe temporary board state
func SimulateMove(b *Board, fr, fc, tr, tc int) (*Board, error) {

	clone := b.Clone()

	piece := clone.Grid[fr][fc]
	if piece == nil {
		return nil, nil
	}

	clone.Grid[tr][tc] = piece
	clone.Grid[fr][fc] = nil

	return clone, nil
}




func GetAllMoves(g *Game, color string) []Move {

	var moves []Move

	for r1 := 0; r1 < 8; r1++ {
		for c1 := 0; c1 < 8; c1++ {

			piece := g.Board.Grid[r1][c1]

			if piece == nil || piece.Color != color {
				continue
			}

			for r2 := 0; r2 < 8; r2++ {
				for c2 := 0; c2 < 8; c2++ {

					if r1 == r2 && c1 == c2 {
						continue
					}

					if !IsValidMove(g.Board, piece, r1, c1, r2, c2) {
						continue
					}

					clone, _ := SimulateMove(g.Board, r1, c1, r2, c2)

					tempGame := &Game{Board: clone, CurrentTurn: color}

					if !tempGame.IsKingInDanger(color) {

						moves = append(moves, Move{
							FromRow: r1,
							FromCol: c1,
							ToRow:   r2,
							ToCol:   c2,
						})
					}
				}
			}
		}
	}

	return moves
}