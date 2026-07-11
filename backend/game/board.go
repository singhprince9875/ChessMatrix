package game

import (
	"errors"
	"fmt"
)

type Piece struct {
	Name   string // "Pawn", "Rook", "Knight", "Bishop", "Queen", "King"
	Color  string // "White", "Black"
	Symbol string // e.g. "R", "N", "B", "Q", "K", "P" for White, "r", "n", "b", "q", "k", "p" for Black
}

type Move struct {
	FromRow int
	FromCol int
	ToRow   int
	ToCol   int

	PieceMoved    *Piece
	PieceCaptured *Piece
}

type Board struct {
	Grid        [8][8]*Piece
	MoveHistory []Move
}

// NewBoard creates and initializes a board with default chess piece layout.
func NewBoard() *Board {
	b := &Board{}
	b.Initialize()
	return b
}

func (b *Board) Initialize() {
	b.setupBlackPieces()
	b.setupWhitePieces()
}

func (b *Board) setupBlackPieces() {
	pieces := []string{
		"Rook", "Knight", "Bishop", "Queen",
		"King", "Bishop", "Knight", "Rook",
	}
	symbols := []string{"r", "n", "b", "q", "k", "b", "n", "r"}

	for col := 0; col < 8; col++ {
		b.Grid[0][col] = &Piece{pieces[col], "Black", symbols[col]}
		b.Grid[1][col] = &Piece{"Pawn", "Black", "p"}
	}
}

func (b *Board) setupWhitePieces() {
	pieces := []string{
		"Rook", "Knight", "Bishop", "Queen",
		"King", "Bishop", "Knight", "Rook",
	}
	symbols := []string{"R", "N", "B", "Q", "K", "B", "N", "R"}

	for col := 0; col < 8; col++ {
		b.Grid[7][col] = &Piece{pieces[col], "White", symbols[col]}
		b.Grid[6][col] = &Piece{"Pawn", "White", "P"}
	}
}

func (b *Board) IsValidPosition(r, c int) bool {
	return r >= 0 && r < 8 && c >= 0 && c < 8
}

func (b *Board) GetPiece(r, c int) *Piece {
	if !b.IsValidPosition(r, c) {
		return nil
	}
	return b.Grid[r][c]
}

func (b *Board) MovePiece(fr, fc, tr, tc int) (Move, error) {
	if !b.IsValidPosition(fr, fc) || !b.IsValidPosition(tr, tc) {
		return Move{}, errors.New("invalid position")
	}

	piece := b.Grid[fr][fc]
	if piece == nil {
		return Move{}, errors.New("no piece at source")
	}

	target := b.Grid[tr][tc]
	if target != nil && target.Color == piece.Color {
		return Move{}, errors.New("cannot capture own piece")
	}

	move := Move{
		FromRow:       fr,
		FromCol:       fc,
		ToRow:         tr,
		ToCol:         tc,
		PieceMoved:    piece,
		PieceCaptured: target,
	}

	b.Grid[tr][tc] = piece
	b.Grid[fr][fc] = nil
	b.MoveHistory = append(b.MoveHistory, move)

	return move, nil
}

func (b *Board) UndoMove() error {
	if len(b.MoveHistory) == 0 {
		return errors.New("no moves to undo")
	}

	last := b.MoveHistory[len(b.MoveHistory)-1]
	b.Grid[last.FromRow][last.FromCol] = last.PieceMoved
	b.Grid[last.ToRow][last.ToCol] = last.PieceCaptured
	b.MoveHistory = b.MoveHistory[:len(b.MoveHistory)-1]

	return nil
}

func (b *Board) IsPathClear(sr, sc, er, ec int) bool {
	rowStep, colStep := 0, 0

	if sr < er {
		rowStep = 1
	} else if sr > er {
		rowStep = -1
	}

	if sc < ec {
		colStep = 1
	} else if sc > ec {
		colStep = -1
	}

	r, c := sr+rowStep, sc+colStep
	for r != er || c != ec {
		if b.Grid[r][c] != nil {
			return false
		}
		r += rowStep
		c += colStep
	}

	return true
}

func (b *Board) Clone() *Board {
	nb := &Board{}
	for i := 0; i < 8; i++ {
		for j := 0; j < 8; j++ {
			if b.Grid[i][j] != nil {
				p := *b.Grid[i][j]
				nb.Grid[i][j] = &p
			}
		}
	}
	return nb
}

func (b *Board) ResetBoard() {
	for i := range b.Grid {
		for j := range b.Grid[i] {
			b.Grid[i][j] = nil
		}
	}
	b.Initialize()
}

func (b *Board) PrintBoard() {
	fmt.Println("\n    A B C D E F G H")
	for r := 0; r < 8; r++ {
		fmt.Printf("%d | ", 8-r)
		for c := 0; c < 8; c++ {
			if b.Grid[r][c] == nil {
				fmt.Print(". ")
			} else {
				fmt.Print(b.Grid[r][c].Symbol, " ")
			}
		}
		fmt.Printf("| %d\n", 8-r)
	}
	fmt.Println("    A B C D E F G H\n")
}

func (b *Board) Serialize() [8][8]string {
	var grid [8][8]string
	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {
			if b.Grid[r][c] != nil {
				grid[r][c] = b.Grid[r][c].Symbol
			} else {
				grid[r][c] = ""
			}
		}
	}
	return grid
}
