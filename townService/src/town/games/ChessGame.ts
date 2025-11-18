import { Chess } from 'chess.ts';
import InvalidParametersError, {
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  GAME_NOT_STARTABLE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  ChessGameState,
  ChessMove,
  GameMove,
  PlayerID,
  ChessColor,
} from '../../types/CoveyTownSocket';
import { Color, Coords, FENChar } from './chess-game-logic/models';
import Game from './Game';

/**
 * A ChessGame is a Game that implements the rules of Chess.
 */

export default class ChessGame extends Game<ChessGameState, ChessMove> {
  private _engine: Chess;

  public constructor(priorGame?: ChessGame) {
    super({
      moves: [],
      status: 'WAITING_FOR_PLAYERS',
      firstPlayer: 'White',
    });
    this._engine = new Chess();
  }

  /* ------------------ Helper Functions ------------------ */
  /** Convert grid row/col (0..7, top-left origin) to 'a1'..'h8'. */
  private _toSquareFromRowCol(row: number, col: number): string {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = files[col]; // col: 0..7 -> a..h
    const rank = 8 - row; // row: 0 (top) -> rank 8
    return `${file}${rank}`;
  }

  /** Convert algebraic square like 'e4' to internal coordinates {x, y}. */
  private _fromSquare(square: string): Coords {
    const file = square[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1], 10);
    return { x: file, y: 8 - rank };
  }

  /** Translate single-letter promotion notation to our FENChar type. */
  private _promotionFenChar(letter: 'q' | 'r' | 'b' | 'n'): FENChar {
    const white = this._engine.turn() === 'w';
    switch (letter) {
      case 'q':
        return white ? FENChar.WhiteQueen : FENChar.BlackQueen;
      case 'r':
        return white ? FENChar.WhiteRook : FENChar.BlackRook;
      case 'b':
        return white ? FENChar.WhiteBishop : FENChar.BlackBishop;
      case 'n':
        return white ? FENChar.WhiteKnight : FENChar.BlackKnight;
      default:
        return white ? FENChar.WhiteQueen : FENChar.BlackQueen;
    }
  }

  /* Determine the current player's ID based on chess.ts turn. */
  private _currentPlayerID(): PlayerID | undefined {
    const turn = this._engine.turn(); // 'w' or 'b'
    return turn === 'w' ? this.state.white : this.state.black;
  }

  /** Determine the winner when checkmate occurs. */
  private _winnerOnCheckmate(): PlayerID | undefined {
    const loser = this._engine.turn(); // side to move after mate
    return loser === 'w' ? this.state.black : this.state.white;
  }

  /* ------------------------------------------------------ */

  /**
   * Handles game state for when a player joins the game
   */
  protected _join(player: Player): void {
    // player already in game
    if (this.state.white === player.id || this.state.black === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }

    // add white player
    if (!this.state.white) {
      this.state = {
        ...this.state,
        status: 'WAITING_FOR_PLAYERS',
        white: player.id,
      };

      // add black player
    } else if (!this.state.black) {
      this.state = {
        ...this.state,
        status: 'WAITING_FOR_PLAYERS',
        black: player.id,
      };

      // game already has two players
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }

    // both players present; waiting to start
    if (this.state.white && this.state.black) {
      this.state.status = 'WAITING_TO_START';
    }
  }

  /**
   * Handles game state for when the game starts
   */
  public startGame(player: Player): void {
    // game not startable
    if (this.state.status !== 'WAITING_TO_START') {
      throw new InvalidParametersError(GAME_NOT_STARTABLE_MESSAGE);
    }

    // player not in game
    if (this.state.white !== player.id && this.state.black !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // mark player as ready
    if (this.state.white === player.id) {
      this.state.whiteReady = true;
    }
    if (this.state.black === player.id) {
      this.state.blackReady = true;
    }

    // if both players ready, start game
    this.state = {
      ...this.state,
      status: this.state.whiteReady && this.state.blackReady ? 'IN_PROGRESS' : 'WAITING_TO_START',
    };
    // and initialize board and game state
    if (this.state.whiteReady && this.state.blackReady) {
      this._engine = new Chess(); // reset to initial board
      this.state.moves = [];
      this.state.firstPlayer = 'White';
    }
  }

  /**
   * When a move is made, this method checks that it is valid and applies it to the game state
   */
  public applyMove(request: GameMove<ChessMove>): void {
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    const mover = request.playerID;
    if (mover !== this.state.white && mover !== this.state.black) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    const expected = this._currentPlayerID();
    if (!expected || mover !== expected) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    const { move } = request;
    this._validateMove(move);
    this._applyMove(move);

    this.state.moves = [...this.state.moves, request.move];
    this._checkForGameEnding();
  }

  // Applies the given move to the internal chess engine state
  protected _applyMove(move: ChessMove): void {
    const from = this._toSquareFromRowCol(move.oldRow, move.oldCol);
    const to = this._toSquareFromRowCol(move.newRow, move.newCol);
    const promotion = move.promotion
      ? (move.promotion.toLowerCase() as 'q' | 'r' | 'b' | 'n')
      : undefined;

    const result = this._engine.move({ from, to, promotion });
    if (!result) {
      // Should not happen if _validateMove passed, but keep the guard
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
  }

  /**
   * Validates that a proposed move is legal according to chess rules
   */
  protected _validateMove(move: ChessMove): void {
    // --- basic bounds & trivial invalids ---
    const inBounds = (n: number) => n >= 0 && n < 8;
    if (
      !inBounds(move.oldRow) ||
      !inBounds(move.oldCol) ||
      !inBounds(move.newRow) ||
      !inBounds(move.newCol)
    ) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
    if (move.oldRow === move.newRow && move.oldCol === move.newCol) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }

    // --- convert to algebraic squares (row 0 = rank 8, col 0 = file a) ---
    const from = this._toSquareFromRowCol(move.oldRow, move.oldCol);
    const to = this._toSquareFromRowCol(move.newRow, move.newCol);

    // --- turn ownership & piece presence/color checks ---
    const engineTurn = this._engine.turn(); // 'w' | 'b'
    const expectedColor: ChessColor = engineTurn === 'w' ? 'White' : 'Black';
    if (move.gamePiece !== expectedColor) {
      // client claims the wrong color piece is moving this turn
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    const pieceAtFrom = this._engine.get(from); // { type: 'p'|'n'|..., color: 'w'|'b' } | null
    if (!pieceAtFrom) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
    if (pieceAtFrom.color !== engineTurn) {
      // trying to move opponent’s piece
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    // --- promotion sanity (only pawns may promote, only on last rank, letter must be QRBN) ---
    const isPawn = pieceAtFrom.type === 'p';
    const toRank = parseInt(to[1], 10); // '1'..'8'
    const reachesLastRank =
      (engineTurn === 'w' && toRank === 8) || (engineTurn === 'b' && toRank === 1);

    const promotion: 'q' | 'r' | 'b' | 'n' | undefined = move.promotion
      ? (move.promotion.toLowerCase() as 'q' | 'r' | 'b' | 'n')
      : undefined;

    // If promotion is provided, it must be a pawn move to last rank
    if (promotion && (!isPawn || !reachesLastRank)) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
    // If promotion is required (pawn reaches last rank) but not provided, you may:
    // - throw to force the client to specify, OR
    // - default to 'q'. Here we throw so UI can prompt.
    if (!promotion && isPawn && reachesLastRank) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }

    // --- final legality check on a cloned engine so we don't mutate state ---
    const test = new Chess(this._engine.fen());
    const ok = test.move({ from, to, promotion });
    if (!ok) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
  }

  /**
   * Checks for game ending conditions (checkmate, stalemate, draw) and updates state accordingly
   */
  private _checkForGameEnding(): void {
    if (this._engine.inCheckmate()) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this._winnerOnCheckmate(),
        whiteReady: false,
        blackReady: false,
      };
      return;
    }

    const draw =
      this._engine.inStalemate() ||
      this._engine.insufficientMaterial() ||
      this._engine.inThreefoldRepetition() ||
      this._engine.inDraw();

    if (draw) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: undefined,
        whiteReady: false,
        blackReady: false,
      };
    }
  }

  /**
   * Handles game state for when a player leaves the game
   */
  protected _leave(player: Player): void {
    // remove the player from the game state
    const removePlayer = (playerID: string): Color => {
      if (this.state.white === playerID) {
        this.state = {
          ...this.state,
          white: undefined,
        };
        return 0;
      }
      if (this.state.black === playerID) {
        this.state = {
          ...this.state,
          black: undefined,
        };
        return 1;
      }
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    };
    const color = removePlayer(player.id);

    // update game status based on current state
    switch (this.state.status) {
      // 'WAITING_TO_START', 'WAITING_FOR_PLAYERS', and 'OVER' all have the same case behvaior
      // cuz apPARENTLY THE LINTER DOESN'T LIKE FALLTHROUGHS
      case 'WAITING_TO_START':
        this.state = {
          ...this.state,
          status: 'WAITING_FOR_PLAYERS',
          whiteReady: false,
          blackReady: false,
        };
        break;
      case 'WAITING_FOR_PLAYERS':
        this.state = {
          ...this.state,
          status: 'WAITING_FOR_PLAYERS',
          whiteReady: false,
          blackReady: false,
        };
        break;
      // if the game is over, reset to wait for players to join
      case 'OVER':
        this.state = {
          ...this.state,
          status: 'WAITING_FOR_PLAYERS',
          whiteReady: false,
          blackReady: false,
        };
        break;
      // if the game was in progress, the other player wins
      case 'IN_PROGRESS':
        this.state = {
          ...this.state,
          status: 'OVER',
          winner: color === 0 ? this.state.black : this.state.white,
          whiteReady: false,
          blackReady: false,
        };
        break;
      default:
        throw new Error(`Unexpected game status: ${this.state.status}`);
    }
  }
}
