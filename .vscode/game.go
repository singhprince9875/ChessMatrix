package main

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

// ---------------- CREATE GAME ----------------

func NewGame() *Game {
	return &Game{
		Board:       NewBoard(),
		CurrentTurn: "White",
		GameOver:    false,
	}
}

// ---------------- MOVE EXECUTION ----------------

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

	// validate move using piece rules
	if !IsValidMove(g.Board, piece, fr, fc, tr, tc) {
		return errors.New("invalid move for piece")
	}

	// execute move
	_, err := g.Board.MovePiece(fr, fc, tr, tc)
	if err != nil {
		return err
	}

	// switch turn
	g.switchTurn()

	return nil
}

// ---------------- TURN SYSTEM ----------------

func (g *Game) switchTurn() {
	if g.CurrentTurn == "White" {
		g.CurrentTurn = "Black"
	} else {
		g.CurrentTurn = "White"
	}
}

// ---------------- CHECK (BASIC VERSION) ----------------

// (You will improve later using simulation + king finding)

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

// ---------------- FIND KING ----------------

func (g *Game) findKing(color string) (int, int) {

	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {

			p := g.Board.Grid[r][c]

			if p != nil &&
				p.Name == "King" &&
				p.Color == color {

				return r, c
			}
		}
	}

	return -1, -1
}

// ---------------- PRINT STATUS ----------------

func (g *Game) PrintStatus() {
	fmt.Println("Turn:", g.CurrentTurn)

	if g.IsKingInDanger(g.CurrentTurn) {
		fmt.Println("⚠️ King is in danger!")
	}
}