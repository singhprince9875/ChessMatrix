package main

// ---------------- PIECE MOVES ENTRY ----------------

func IsValidMove(b *Board, piece *Piece, fr, fc, tr, tc int) bool {

	switch piece.Name {

	case "Pawn":
		return validatePawn(b, piece, fr, fc, tr, tc)

	case "Rook":
		return validateRook(b, fr, fc, tr, tc)

	case "Bishop":
		return validateBishop(b, fr, fc, tr, tc)

	case "Queen":
		return validateQueen(b, fr, fc, tr, tc)

	case "King":
		return validateKing(b, fr, fc, tr, tc)

	case "Knight":
		return validateKnight(fr, fc, tr, tc)
	}

	return false
}

// ---------------- PAWN ----------------

func validatePawn(b *Board, p *Piece, fr, fc, tr, tc int) bool {

	dir := -1
	startRow := 6

	if p.Color == "Black" {
		dir = 1
		startRow = 1
	}

	// forward move
	if fc == tc {

		// one step
		if tr == fr+dir && b.Grid[tr][tc] == nil {
			return true
		}

		// two step from start
		if fr == startRow && tr == fr+2*dir &&
			b.Grid[fr+dir][fc] == nil &&
			b.Grid[tr][tc] == nil {
			return true
		}
	}

	// diagonal capture
	if (tc == fc+1 || tc == fc-1) &&
		tr == fr+dir &&
		b.Grid[tr][tc] != nil {

		return true
	}

	return false
}

// ---------------- ROOK ----------------

func validateRook(b *Board, fr, fc, tr, tc int) bool {

	if fr != tr && fc != tc {
		return false
	}

	return b.IsPathClear(fr, fc, tr, tc)
}

// ---------------- BISHOP ----------------

func validateBishop(b *Board, fr, fc, tr, tc int) bool {

	if abs(fr-tr) != abs(fc-tc) {
		return false
	}

	return b.IsPathClear(fr, fc, tr, tc)
}

// ---------------- QUEEN ----------------

func validateQueen(b *Board, fr, fc, tr, tc int) bool {

	return validateRook(b, fr, fc, tr, tc) ||
		validateBishop(b, fr, fc, tr, tc)
}

// ---------------- KING ----------------

func validateKing(b *Board, fr, fc, tr, tc int) bool {

	if abs(fr-tr) <= 1 && abs(fc-tc) <= 1 {
		return true
	}

	return false
}

// ---------------- KNIGHT ----------------

func validateKnight(fr, fc, tr, tc int) bool {

	dr := abs(fr - tr)
	dc := abs(fc - tc)

	return (dr == 2 && dc == 1) || (dr == 1 && dc == 2)
}

// ---------------- HELPER ----------------

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}