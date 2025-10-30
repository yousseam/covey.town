import { Color, Coords, FENChar } from "../models";
import { Piece } from "./piece";

export class Rook extends Piece {
  /* 
    The _hasMoved identifier is used to define if the piece has moved in a previous
    turn of the game to check for the validity of special moves such as castling(rook and king) and en'passant(pawn).

    if the piece moves at any turn in the game, _hasMoved should be turned true for the rest of the game using its seter function, hasMoved();.

    for cheking the value of _hasMoved, the getter funciton; hasMoved(); can be used.
  */
  private _hasMoved: boolean = false;
  protected override _FENChar: FENChar;
  protected override _directions: Coords[] = [
    {x: 1, y: 0},
    {x: -1, y: 0},
    {x: 0, y: 1},
    {x: 0, y: -1}
  ];

  constructor(private pieceColor: Color) {
    super(pieceColor);
    this._FENChar = pieceColor === Color.White ? FENChar.WhiteRook : FENChar.BlackRook;
  }

  public get hasMoved(): boolean {
    return this._hasMoved;
  }

  public set hasMoved(_) {
    this._hasMoved = true;
  }
}