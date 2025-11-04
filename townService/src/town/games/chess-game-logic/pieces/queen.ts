import { Color, Coords, FENChar } from '../models';
import Piece from './piece';

export default class Queen extends Piece {
  protected override _FENChar: FENChar;

  protected override _directions: Coords[] = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];

  constructor(private _pieceColor: Color) {
    super(_pieceColor);
    this._FENChar = _pieceColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
  }
}
