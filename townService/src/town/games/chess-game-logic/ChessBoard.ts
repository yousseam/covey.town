import { Color, FENChar } from './models';
import Bishop from './pieces/bishop';
import King from './pieces/king';
import Knight from './pieces/knight';
import Pawn from './pieces/pawn';
import Piece from './pieces/piece';
import Queen from './pieces/queen';
import Rook from './pieces/rook';

export default class ChessBoard {
  private _chessBoard: (Piece | undefined)[][];

  private _playerColor = Color.White;

  constructor() {
    this._chessBoard = [
      [
        new Rook(Color.White),
        new Knight(Color.White),
        new Bishop(Color.White),
        new Queen(Color.White),
        new King(Color.White),
        new Bishop(Color.White),
        new Knight(Color.White),
        new Rook(Color.White),
      ],
      [
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
      ],
      [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      [
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
      ],
      [
        new Rook(Color.Black),
        new Knight(Color.Black),
        new Bishop(Color.Black),
        new Queen(Color.Black),
        new King(Color.Black),
        new Bishop(Color.Black),
        new Knight(Color.Black),
        new Rook(Color.Black),
      ],
    ];
  }

  // returns the color of the current player
  public get playerColor(): Color {
    return this._playerColor;
  }

  // returns current board format in FENChar or undefined values
  public get chessBoardView(): (FENChar | undefined)[][] {
    return this._chessBoard.map(row =>
      row.map(piece => (piece instanceof Piece ? piece.FENChar : undefined)),
    );
  }

  // use in the html when defining the color of each square
  public isSquareDark(x: number, y: number): boolean {
    return (x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1);
  }
}
