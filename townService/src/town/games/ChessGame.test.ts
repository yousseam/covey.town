import { Chess } from 'chess.ts';
import ChessGame from './ChessGame';
import InvalidParametersError, {
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  GAME_FULL_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import { ChessMove, ChessGameState, GameMove } from '../../types/CoveyTownSocket';

function makePlayer(id: string, userName: string): Player {
  // Adapt this constructor to your actual Player class
  // Common pattern in CoveyTown: new Player(userName, id)
  // If your Player constructor is different, change this helper once.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Player as any)(userName, id);
}

function makeGameMove(playerID: string, gameID: string, move: ChessMove): GameMove<ChessMove> {
  return { playerID, gameID, move };
}

// Helpers to map algebraic to row/col using the *same convention* as ChessGame
function squareToRowCol(square: string): { row: number; col: number } {
  const fileChar = square[0];
  const rank = parseInt(square[1], 10); // 1..8
  const col = fileChar.charCodeAt(0) - 'a'.charCodeAt(0); // 0..7
  const row = 8 - rank; // rank 8 -> row 0, rank 1 -> row 7
  return { row, col };
}

function makeChessMove(
  from: string,
  to: string,
  gamePiece: 'White' | 'Black',
  promotion?: 'Q' | 'R' | 'B' | 'N',
): ChessMove {
  const { row: oldRow, col: oldCol } = squareToRowCol(from);
  const { row: newRow, col: newCol } = squareToRowCol(to);
  return {
    gamePiece,
    oldRow: oldRow as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    oldCol: oldCol as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    newRow: newRow as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    newCol: newCol as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    ...(promotion ? { promotion } : {}),
  };
}

describe('ChessGame', () => {
  let game: ChessGame;
  let white: Player;
  let black: Player;
  const gameID = 'test-game-id';

  beforeEach(() => {
    game = new ChessGame();
    white = makePlayer('white-id', 'whitePlayer');
    black = makePlayer('black-id', 'blackPlayer');

    // _join is protected; call via "as any" in tests
    (game as any)._join(white);
    (game as any)._join(black);

    // Both players ready -> game IN_PROGRESS
    game.startGame(white);
    game.startGame(black);
  });

  test('initial state after both players ready is IN_PROGRESS with white to move', () => {
    const { state } = game as any;
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.white).toBe(white.id);
    expect(state.black).toBe(black.id);
    expect(state.moves.length).toBe(0);
  });

  test('third player cannot join (GAME_FULL_MESSAGE)', () => {
    const extra = makePlayer('extra-id', 'extra');
    const anotherGame = new ChessGame();
    (anotherGame as any)._join(makePlayer('p1', 'p1'));
    (anotherGame as any)._join(makePlayer('p2', 'p2'));
    expect(() => (anotherGame as any)._join(extra)).toThrow(InvalidParametersError);
    expect(() => (anotherGame as any)._join(extra)).toThrow(GAME_FULL_MESSAGE);
  });

  test('legal move e2e4 by white is accepted and recorded', () => {
    const move = makeChessMove('e2', 'e4', 'White');

    const gm = makeGameMove(white.id, gameID, move);
    expect(() => game.applyMove(gm)).not.toThrow();

    const { state } = game as any;
    expect(state.moves.length).toBe(1);
    const lastMove = state.moves[0];
    expect(lastMove.oldRow).toBe(squareToRowCol('e2').row);
    expect(lastMove.newRow).toBe(squareToRowCol('e4').row);
  });

  test('illegal move e2e5 is rejected (BOARD_POSITION_NOT_VALID_MESSAGE)', () => {
    const move = makeChessMove('e2', 'e5', 'White'); // pawn 3 squares

    const gm = makeGameMove(white.id, gameID, move);
    expect(() => game.applyMove(gm)).toThrow(InvalidParametersError);
    expect(() => game.applyMove(gm)).toThrow(BOARD_POSITION_NOT_VALID_MESSAGE);
  });

  test('black cannot move first (MOVE_NOT_YOUR_TURN_MESSAGE)', () => {
    const move = makeChessMove('e7', 'e5', 'Black');

    const gm = makeGameMove(black.id, gameID, move);
    expect(() => game.applyMove(gm)).toThrow(InvalidParametersError);
    expect(() => game.applyMove(gm)).toThrow(MOVE_NOT_YOUR_TURN_MESSAGE);
  });

  test('game must be IN_PROGRESS to accept moves', () => {
    const anotherGame = new ChessGame();
    const p1 = makePlayer('p1', 'p1');
    (anotherGame as any)._join(p1);

    const move = makeChessMove('e2', 'e4', 'White');
    const gm = makeGameMove(p1.id, gameID, move);

    expect(() => anotherGame.applyMove(gm)).toThrow(InvalidParametersError);
    expect(() => anotherGame.applyMove(gm)).toThrow(GAME_NOT_IN_PROGRESS_MESSAGE);
  });

  test('Fools mate results in checkmate and winner is black', () => {
    // Sequence:
    // 1. f3 e5
    // 2. g4 Qh4#
    const moves: { player: Player; sanFrom: string; sanTo: string; color: 'White' | 'Black' }[] = [
      { player: white, sanFrom: 'f2', sanTo: 'f3', color: 'White' },
      { player: black, sanFrom: 'e7', sanTo: 'e5', color: 'Black' },
      { player: white, sanFrom: 'g2', sanTo: 'g4', color: 'White' },
      { player: black, sanFrom: 'd8', sanTo: 'h4', color: 'Black' }, // Qh4#
    ];

    moves.forEach(m => {
      const move = makeChessMove(m.sanFrom, m.sanTo, m.color);
      const gm = makeGameMove(m.player.id, gameID, move);
      expect(() => game.applyMove(gm)).not.toThrow();
    });

    const { state } = game as any;
    expect(state.status).toBe('OVER');
    expect(state.winner).toBe(black.id);
  });

  test('leaving during IN_PROGRESS sets winner to remaining player', () => {
    // White makes a legal first move
    const firstMove = makeChessMove('e2', 'e4', 'White');
    game.applyMove(makeGameMove(white.id, gameID, firstMove));

    // Black leaves
    (game as any)._leave(black);

    const { state } = game as any;
    expect(state.status).toBe('OVER');
    expect(state.winner).toBe(white.id);
  });
});
