func ValidateServerMove(g *Game, fr, fc, tr, tc int) error {

	piece := g.Board.Grid[fr][fc]

	if piece == nil {
		return errors.New("invalid move")
	}

	if piece.Color != g.CurrentTurn {
		return errors.New("not your turn")
	}

	if !IsValidMove(g.Board, piece, fr, fc, tr, tc) {
		return errors.New("illegal move detected")
	}

	return nil
}