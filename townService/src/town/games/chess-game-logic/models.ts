/* 
    This file is used to define models that are used across the Chess-game-logic 
*/

export enum Color {
  White,
  Black
}

export type Coords = {
  x: number;
  y: number;
}

export enum FENChar {
  WhitePawn = "P",
  WhiteKnight = "N",
  WhiteBishop = "B",
  WhiteRook = "R",
  WhiteQueen = "Q",
  WhiteKing = "K",
  BlackPawn = "p",
  BlackKnight = "n",
  BlackBishop = "b",
  BlackRook = "r",
  BlackQueen = "q",
  BlackKing = "k"
}