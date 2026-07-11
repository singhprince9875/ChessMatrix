package game

import (
	"errors"
	"fmt"
)

type Game struct {
	Board       *Board
	CurrentTurn string
	GameOver    bool
	Winner      string
}

func NewGame() *Game {
	return &Game{
		Board:       NewBoard(),
		CurrentTurn: "White",
		GameOver:    false,
	}
}

func (g *Game) Move(fr, fc, tr, tc int) error {
	if g.GameOver {
		return errors.New("game is over")
	}

	piece := g.Board.Grid[fr][fc]
	if piece == nil {
		return errors.New("no piece selected")
	}

	if piece.Color != g.CurrentTurn {
		return errors.New("not your turn")
	}

	if !IsValidMove(g.Board, piece, fr, fc, tr, tc) {
		return errors.New("invalid move for piece")
	}

	// Verify that the move doesn't leave the current player's king in danger
	clone, err := SimulateMove(g.Board, fr, fc, tr, tc)
	if err != nil {
		return err
	}
	if clone != nil {
		tempGame := &Game{Board: clone, CurrentTurn: g.CurrentTurn}
		if tempGame.IsKingInDanger(g.CurrentTurn) {
			return errors.New("cannot make move: leaves king in check")
		}
	}

	_, err = g.Board.MovePiece(fr, fc, tr, tc)
	if err != nil {
		return err
	}

	// Switch turn
	g.switchTurn()

	// Check if the opponent is checkmated
	if IsCheckmate(g, g.CurrentTurn) {
		g.GameOver = true
		if g.CurrentTurn == "White" {
			g.Winner = "Black"
		} else {
			g.Winner = "White"
		}
	}

	return nil
}

func (g *Game) switchTurn() {
	if g.CurrentTurn == "White" {
		g.CurrentTurn = "Black"
	} else {
		g.CurrentTurn = "White"
	}
}

func (g *Game) IsKingInDanger(color string) bool {
	kingRow, kingCol := g.findKing(color)
	if kingRow == -1 {
		return false
	}

	opponent := "White"
	if color == "White" {
		opponent = "Black"
	}

	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {
			p := g.Board.Grid[r][c]
			if p != nil && p.Color == opponent {
				if IsValidMove(g.Board, p, r, c, kingRow, kingCol) {
					return true
				}
			}
		}
	}

	return false
}

func (g *Game) findKing(color string) (int, int) {
	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {
			p := g.Board.Grid[r][c]
			if p != nil && p.Name == "King" && p.Color == color {
				return r, c
			}
		}
	}
	return -1, -1
}

func (g *Game) PrintStatus() {
	fmt.Println("Turn:", g.CurrentTurn)
	if g.IsKingInDanger(g.CurrentTurn) {
		fmt.Println("⚠️ King is in danger!")
	}
}
