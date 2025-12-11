/**
 *  Expanded Backend Test Suite for ChessGame.ts.
 *  Tests Joining behavior
 *  Tests Game start states
 *  Tests Legal and Illegal moves
 *  Tests Promotion logic
 *  Tests Final Game State detection (checkmate, insufficient material)
 *  Tests Leaving Game behavior
 *  Tests Multi-game cycles
 */

import { BroadcastOperator } from 'socket.io';
import ChessGame from './ChessGame';
import {
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  GAME_NOT_STARTABLE_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  ChessMove,
  ChessColor,
  PlayerID,
  ServerToClientEvents,
  SocketData,
} from '../../types/CoveyTownSocket';

// Test Helpers

// Proper TownEmitter mock for backend Player constructor
function makeMockEmitter(): BroadcastOperator<ServerToClientEvents, SocketData> {
  const mock: any = {
    emit: (..._args: unknown[]) => true,

    to: (..._rooms: string[]) => mock,
    in: (..._rooms: string[]) => mock,
    except: (..._rooms: string[]) => mock,

    adapter: {
      rooms: new Map(),
      sids: new Map(),
      addAll: () => {},
      del: () => {},
      delAll: () => {},
      broadcast: () => {},
    },
  };

  return mock as BroadcastOperator<ServerToClientEvents, SocketData>;
}

// Create a real Player object
function makePlayer(userName: string): Player {
  return new Player(userName, makeMockEmitter());
}

// Convert "e4" -> { row, col }
function squareToRowCol(square: string): { row: number; col: number } {
  const file = square[0];
  const rank = Number(square[1]);
  const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - rank;
  return { row, col };
}

// Create a ChessMove with ChessGridPosition cast fix
function makeChessMove(
  from: string,
  to: string,
  color: ChessColor,
  promotion?: 'Q' | 'R' | 'B' | 'N',
): ChessMove {
  const { row: oldRow, col: oldCol } = squareToRowCol(from);
  const { row: newRow, col: newCol } = squareToRowCol(to);

  return {
    gamePiece: color,
    oldRow: oldRow as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    oldCol: oldCol as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    newRow: newRow as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    newCol: newCol as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    ...(promotion ? { promotion } : {}),
  };
}

// Create GameMove wrapper
function makeGameMove(playerID: PlayerID, gameID: string, move: ChessMove) {
  return { playerID, gameID, move };
}

type MoveTriple = [string, string, Player];

// Test Suite

describe('ChessGame — backend test suite', () => {
  let game: ChessGame;
  let white: Player;
  let black: Player;
  let gameID: string;

  beforeEach(() => {
    game = new ChessGame();
    white = makePlayer('white');
    black = makePlayer('black');
    gameID = game.id;

    game.join(white);
    game.join(black);

    game.startGame(white);
    game.startGame(black);
  });

  // Join Game Tests

  describe('joining players', () => {
    test('first join becomes white, second becomes black', () => {
      const newGame = new ChessGame();
      const p1 = makePlayer('p1');
      const p2 = makePlayer('p2');

      (newGame as any)._join(p1);
      expect((newGame as any).state.white).toBe(p1.id);

      (newGame as any)._join(p2);
      expect((newGame as any).state.black).toBe(p2.id);
      expect((newGame as any).state.status).toBe('WAITING_TO_START');
    });

    test('joining twice throws PLAYER_ALREADY_IN_GAME', () => {
      expect(() => (game as any)._join(white)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    test('third player rejected (GAME_FULL_MESSAGE)', () => {
      expect(() => (game as any)._join(makePlayer('extra'))).toThrow(GAME_FULL_MESSAGE);
    });
  });

  // Start Game Tests

  describe('startGame()', () => {
    test('cannot start with only one player', () => {
      const g = new ChessGame();
      const p = makePlayer('solo');
      (g as any)._join(p);

      expect(() => g.startGame(p)).toThrow(GAME_NOT_STARTABLE_MESSAGE);
    });

    test('outsider cannot start when game is waiting to start', () => {
      const g = new ChessGame();
      const p1 = makePlayer('p1');
      const p2 = makePlayer('p2');
      const outsider = makePlayer('outsider');

      g.join(p1);
      g.join(p2);

      expect((g as any).state.status).toBe('WAITING_TO_START');

      expect(() => g.startGame(outsider)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    test('second ready triggers IN_PROGRESS', () => {
      const g = new ChessGame();
      const p1 = makePlayer('p1');
      const p2 = makePlayer('p2');

      (g as any)._join(p1);
      (g as any)._join(p2);

      g.startGame(p1);
      expect((g as any).state.whiteReady).toBe(true);

      g.startGame(p2);
      expect((g as any).state.status).toBe('IN_PROGRESS');
    });
  });

  // Legal Move Tests

  describe('legal moves', () => {
    test('white can play e2→e4', () => {
      const move = makeChessMove('e2', 'e4', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(1);
    });

    test('pawn can move one square forward e2→e3', () => {
      const move = makeChessMove('e2', 'e3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(1);
    });

    test('knight can jump from g1→f3', () => {
      const move = makeChessMove('g1', 'f3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(1);
    });

    test('knight can jump from b1→c3', () => {
      const move = makeChessMove('b1', 'c3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(1);
    });

    test('knight can move from b1→a3', () => {
      const move = makeChessMove('b1', 'a3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(1);
    });

    test('bishop can move diagonally c1→f4 after d2→d3', () => {
      // open diagonal
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('d2', 'd3', 'White')));
      // black dummy move
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('c1', 'f4', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('bishop can move diagonally f1→c4 after e2→e3', () => {
      // open diagonal
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('e2', 'e3', 'White')));
      // black dummy
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('f1', 'c4', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('rook can move vertically h1→h3 after h2→h4', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('h2', 'h4', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('h1', 'h3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('rook can move vertically a1→a2 after a2→a3', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('a2', 'a3', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('h7', 'h6', 'Black')));

      const move = makeChessMove('a1', 'a2', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('queen can move vertically d1→d3 after d2→d3', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('d2', 'd4', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('d1', 'd3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('queen can move diagonally d1→h5 after e2→e4', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('e2', 'e4', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('d1', 'h5', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('king can move one square forward e1→e2 after e2→e3', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('e2', 'e3', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('e1', 'e2', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('king can move diagonally e1→d2 after d2→d3 clears path', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('d2', 'd3', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('e1', 'd2', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).not.toThrow();

      expect(game.toModel().state.moves.length).toBe(3);
    });

    test('multi-move sequence works', () => {
      const seq: MoveTriple[] = [
        ['e2', 'e4', white],
        ['e7', 'e5', black],
        ['g1', 'f3', white],
      ];

      seq.forEach(([from, to, player]) => {
        const color: ChessColor = player === white ? 'White' : 'Black';
        const move = makeChessMove(from, to, color);
        game.applyMove(makeGameMove(player.id, gameID, move));
      });

      expect(game.toModel().state.moves.length).toBe(3);
    });
  });

  // Illegal Move Tests

  describe('illegal moves', () => {
    test('move rejected when game not IN_PROGRESS', () => {
      const g = new ChessGame();
      const p = makePlayer('temp');
      (g as any)._join(p);

      const move = makeChessMove('e2', 'e4', 'White');

      expect(() => g.applyMove(makeGameMove(p.id, g.id, move))).toThrow(
        GAME_NOT_IN_PROGRESS_MESSAGE,
      );
    });

    test('black cannot move first', () => {
      const move = makeChessMove('e7', 'e5', 'Black');
      expect(() => game.applyMove(makeGameMove(black.id, gameID, move))).toThrow(
        MOVE_NOT_YOUR_TURN_MESSAGE,
      );
    });

    test('moving from empty square is invalid', () => {
      const move = makeChessMove('a3', 'a4', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('pawn cannot do illegal jump e2→e5', () => {
      const move = makeChessMove('e2', 'e5', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('pawn cannot move backward e4→e3', () => {
      // First legal move
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('e2', 'e4', 'White')));

      // Black makes ANY legal move to give turn back to White
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('e4', 'e3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('pawn cannot move sideways e4→f4', () => {
      game.applyMove(makeGameMove(white.id, gameID, makeChessMove('e2', 'e4', 'White')));
      game.applyMove(makeGameMove(black.id, gameID, makeChessMove('a7', 'a6', 'Black')));

      const move = makeChessMove('e4', 'f4', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('knight cannot move straight g1→g3', () => {
      const move = makeChessMove('g1', 'g3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('knight cannot move like a bishop g1→h2', () => {
      const move = makeChessMove('g1', 'h2', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('knight cannot move to adjacent square g1→h1', () => {
      const move = makeChessMove('g1', 'h1', 'White'); // sideways 1, illegal
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('bishop cannot move straight c1→c3', () => {
      const move = makeChessMove('c1', 'c3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('bishop cannot jump over d2 when trying c1→g5', () => {
      const move = makeChessMove('c1', 'g5', 'White'); // d2 pawn blocks
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('bishop cannot move to non-diagonal offset c1→e2', () => {
      const move = makeChessMove('c1', 'e2', 'White'); // offset not equal in x,y
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('rook cannot move diagonally a1→c3', () => {
      const move = makeChessMove('a1', 'c3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('rook cannot move through a2 when trying a1→a4', () => {
      const move = makeChessMove('a1', 'a4', 'White'); // pawn at a2 blocks
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('queen cannot move like a knight d1→e3', () => {
      const move = makeChessMove('d1', 'e3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('queen cannot move through pieces d1→d8', () => {
      const move = makeChessMove('d1', 'd8', 'White'); // blocked by pawns on d2 etc
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('king cannot move two squares sideways e1→g1 (no castling)', () => {
      const move = makeChessMove('e1', 'g1', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('king cannot move two squares diagonally e1→g3', () => {
      const move = makeChessMove('e1', 'g3', 'White');
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('king cannot move like a knight e1→f3', () => {
      const move = makeChessMove('e1', 'f3', 'White'); // knight-move invalid
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('cannot move into own piece e2→e1', () => {
      const move = makeChessMove('e2', 'e1', 'White'); // king on e1 blocks
      expect(() => game.applyMove(makeGameMove(white.id, gameID, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('out-of-bounds coordinates rejected', () => {
      const badMove: ChessMove = {
        gamePiece: 'White',
        oldRow: 0,
        oldCol: 0,
        newRow: 99 as any,
        newCol: 0,
      };
      expect(() => game.applyMove(makeGameMove(white.id, gameID, badMove))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });
  });

  // Promotion Tests

  describe('promotion logic', () => {
    test('promotion required on last rank', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);
      g.startGame(pw);
      g.startGame(pb);

      // White pawn on a7 ready to promote
      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a8', 'White');
      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('valid white promotion succeeds (Q)', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a8', 'White', 'Q');
      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).not.toThrow();
    });

    test('valid white promotion succeeds (N)', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a8', 'White', 'N');
      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).not.toThrow();
    });

    test('valid white promotion succeeds (B)', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a8', 'White', 'B');
      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).not.toThrow();
    });

    test('valid white promotion succeeds (R)', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a8', 'White', 'R');
      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).not.toThrow();
    });

    test('illegal promotion: pawn cannot promote from non-7th rank', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      // Pawn on a5, nowhere near promotion
      (g as any)._engine.load('8/8/8/8/P7/8/8/8 w - - 0 1');

      const move = makeChessMove('a4', 'a5', 'White', 'Q');

      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('illegal promotion: pawn cannot promote moving backwards', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      const move = makeChessMove('a7', 'a6', 'White', 'Q');

      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });

    test('illegal promotion: move into invalid square cannot promote', () => {
      const g = new ChessGame();
      const pw = makePlayer('pw');
      const pb = makePlayer('pb');

      (g as any)._join(pw);
      (g as any)._join(pb);

      g.startGame(pw);
      g.startGame(pb);

      (g as any)._engine.load('8/P7/8/8/8/8/8/8 w - - 0 1');

      // Pawn tries to move sideways into b8
      const move = makeChessMove('a7', 'b8', 'White', 'Q');

      expect(() => g.applyMove(makeGameMove(pw.id, g.id, move))).toThrow(
        BOARD_POSITION_NOT_VALID_MESSAGE,
      );
    });
  });

  // Checkmate and Draw Tests

  describe('endgame detection', () => {
    test("Fool's Mate → black wins", () => {
      const seq: MoveTriple[] = [
        ['f2', 'f3', white],
        ['e7', 'e5', black],
        ['g2', 'g4', white],
        ['d8', 'h4', black], // checkmate
      ];

      seq.forEach(([from, to, player]) => {
        const color: ChessColor = player === white ? 'White' : 'Black';
        const move = makeChessMove(from, to, color);
        game.applyMove(makeGameMove(player.id, gameID, move));
      });

      const { state } = game.toModel();
      expect(state.status).toBe('OVER');
      expect(state.winner).toBe(black.id);
    });

    test('threefold repetition ends in draw', () => {
      // three time repetition sequence

      const sequence: Array<[string, string, Player]> = [
        ['g1', 'f3', white],
        ['g8', 'f6', black],
        ['f3', 'g1', white],
        ['f6', 'g8', black],
      ];

      for (let i = 0; i < 2; i++) {
        for (const [from, to, player] of sequence) {
          const color: ChessColor = player === white ? 'White' : 'Black';
          const move = makeChessMove(from, to, color);
          const gm = makeGameMove(player.id, gameID, move);
          game.applyMove(gm);
        }
      }

      const { state } = game.toModel();
      expect(state.status).toBe('OVER');
      expect(state.winner).toBeUndefined();
    });
  });

  // Leave Game Tests

  describe('leave behavior', () => {
    test('black leaves during IN_PROGRESS → white wins', () => {
      const move = makeChessMove('e2', 'e4', 'White');
      game.applyMove(makeGameMove(white.id, gameID, move));

      (game as any)._leave(black);

      const { state } = game.toModel();
      expect(state.status).toBe('OVER');
      expect(state.winner).toBe(white.id);
    });

    test('leave during WAITING_TO_START resets state', () => {
      const g = new ChessGame();
      const p1 = makePlayer('p1');
      const p2 = makePlayer('p2');

      (g as any)._join(p1);
      (g as any)._join(p2);

      (g as any)._leave(p2);

      expect(g.toModel().state.status).toBe('WAITING_FOR_PLAYERS');
    });

    test('outsider leaving throws PLAYER_NOT_IN_GAME', () => {
      const outsider = makePlayer('outsider');
      expect(() => (game as any)._leave(outsider)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
    });
  });

  // Multi Game Tests

  describe('multiple game cycles', () => {
    test('can start a new game after one ends', () => {
      const seq: MoveTriple[] = [
        ['f2', 'f3', white],
        ['e7', 'e5', black],
        ['g2', 'g4', white],
        ['d8', 'h4', black],
      ];

      seq.forEach(([from, to, player]) => {
        const color = player === white ? 'White' : 'Black';
        const move = makeChessMove(from, to, color);
        game.applyMove(makeGameMove(player.id, gameID, move));
      });

      expect(game.toModel().state.status).toBe('OVER');

      const g2 = new ChessGame();
      const p1 = makePlayer('p1');
      const p2 = makePlayer('p2');

      g2.join(p1);
      g2.join(p2);

      g2.startGame(p1);
      g2.startGame(p2);

      const { state } = g2.toModel();
      expect(state.status).toBe('IN_PROGRESS');
      expect(state.moves.length).toBe(0);
    });
  });

  // toModel Tests

  describe('toModel()', () => {
    test('returns correct id, players, and state', () => {
      const model = game.toModel();

      expect(model.id).toBe(game.id);
      expect(model.players).toContain(white.id);
      expect(model.players).toContain(black.id);
      expect(model.state.status).toBe('IN_PROGRESS');
    });
  });
});
