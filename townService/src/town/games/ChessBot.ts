import { ChessGridPosition, ChessMove, ChessBotDifficulty } from '../../types/CoveyTownSocket';

type RawBotMove = {
  from: string; // 'e2'
  to: string; // 'e4'
  promotion?: 'q' | 'r' | 'b' | 'n';
};

const STOCKFISH_READY_TOKEN = 'uciok';

// stockfish() comes from the 'stockfish' npm package
function createEngine(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stockfish = require('stockfish');
  return stockfish();
}

function squareToRowCol(square: string): { row: ChessGridPosition; col: ChessGridPosition } {
  const fileChar = square[0]; // 'a'..'h'
  const rank = parseInt(square[1], 10); // '1'..'8'
  const col = (fileChar.charCodeAt(0) - 'a'.charCodeAt(0)) as ChessGridPosition; // 0..7
  const row = (8 - rank) as ChessGridPosition; // rank 8 -> row 0, rank 1 -> row 7
  return { row, col };
}

export default class ChessBot {
  private _difficulty: ChessBotDifficulty;

  public constructor(difficulty: ChessBotDifficulty = 'medium') {
    this._difficulty = difficulty;
  }

  private _goCommand(): string {
    switch (this._difficulty) {
      case 'easy':
        return 'go depth 4';
      case 'medium':
        return 'go depth 8';
      case 'hard':
      default:
        return 'go depth 14';
    }
  }

  /**
   * Ask Stockfish (synchronously, via messages) for the best move in the given FEN.
   * Returns a RawBotMove with algebraic from/to (e.g. 'e2' -> 'e4').
   */
  private async _getRawBestMove(fen: string): Promise<RawBotMove> {
    const engine = createEngine();
    engine.postMessage('uci');

    // Wait for "uciok"
    await new Promise<void>(resolve => {
      engine.onmessage = (msg: string) => {
        if (typeof msg === 'string' && msg.indexOf(STOCKFISH_READY_TOKEN) >= 0) {
          resolve();
        }
      };
    });

    return new Promise<RawBotMove>(resolve => {
      const onMessage = (msg: string) => {
        if (typeof msg === 'string' && msg.startsWith('bestmove')) {
          // Example: "bestmove e2e4" or "bestmove e7e8q"
          const parts = msg.split(' ');
          const movePart = parts[1]; // e2e4, e7e8q
          const from = movePart.slice(0, 2);
          const to = movePart.slice(2, 4);
          let promotion: 'q' | 'r' | 'b' | 'n' | undefined;
          if (movePart.length > 4) {
            promotion = movePart[4] as 'q' | 'r' | 'b' | 'n';
          }
          resolve({ from, to, promotion });
        }
      };

      engine.onmessage = onMessage;
      engine.postMessage('ucinewgame');
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(this._goCommand());
    });
  }

  /**
   * Given a FEN, return a ChessMove-like object (grid coords).
   * NOTE: this does not fill in gamePiece; that is decided by the game logic.
   */
  public async getBestMoveForFen(fen: string): Promise<Omit<ChessMove, 'gamePiece'>> {
    const raw = await this._getRawBestMove(fen);
    const fromRC = squareToRowCol(raw.from);
    const toRC = squareToRowCol(raw.to);

    return {
      oldRow: fromRC.row,
      oldCol: fromRC.col,
      newRow: toRC.row,
      newCol: toRC.col,
      promotion: raw.promotion ? (raw.promotion.toUpperCase() as 'Q' | 'R' | 'B' | 'N') : undefined,
    };
  }
}
