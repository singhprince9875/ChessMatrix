package game

import (
	"errors"
)

// ValidateServerMove checks if the move is legal from a server security perspective.
func ValidateServerMove(g *Game, fr, fc, tr, tc int) error {
	if !g.Board.IsValidPosition(fr, fc) || !g.Board.IsValidPosition(tr, tc) {
		return errors.New("invalid board coordinates")
	}

	piece := g.Board.Grid[fr][fc]
	if piece == nil {
		return errors.New("no piece selected")
	}

	if piece.Color != g.CurrentTurn {
		return errors.New("not your turn")
	}

	if !IsValidMove(g.Board, piece, fr, fc, tr, tc) {
		return errors.New("illegal move detected")
	}

	return nil
}
