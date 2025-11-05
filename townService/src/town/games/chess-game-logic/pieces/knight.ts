import { Color, Coords, FENChar } from '../models';
import Piece from './piece';

export default class Knight extends Piece {
  protected override _FENChar: FENChar;

  protected override _directions: Coords[] = [
    { x: 1, y: 2 },
    { x: 1, y: -2 },
    { x: -1, y: 2 },
    { x: -1, y: -2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: -2, y: 1 },
    { x: -2, y: -1 },
  ];

  constructor(private _pieceColor: Color) {
    super(_pieceColor);
    this._FENChar = _pieceColor === Color.White ? FENChar.WhiteKnight : FENChar.BlackKnight;
  }
}
