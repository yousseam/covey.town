import { Color, Coords, FENChar } from "../models";

/*
	The Piece class is and abstract class that is used as super for every chess-game-piece(pawn, knight, bishop, rook, queen, and king)
*/
export abstract class Piece {
 	protected abstract _FENChar: FENChar;
 	protected abstract _directions: Coords[];

 	constructor(private _color: Color) {}
    
	public get FENChar(): FENChar {
    return this._FENChar;
	}

	public get directions(): Coords[] {
    return this._directions;
	}

	public get color(): Color {
    return this._color;
	}
}