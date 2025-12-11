import { ChessBotDifficulty } from "../../types/CoveyTownSocket";
import StockfishEngine from "./StockfishEngine";
import path from "path";

const getBinaryPath = (): string => {
  const envPath = process.env.STOCKFISH_BIN_PATH;
  if (envPath) {
    return path.isAbsolute(envPath)
      ? envPath
      : path.resolve(process.cwd(), envPath);
  }
  // fallback default path
  const defaultBinary = process.platform === "win32"
    ? "stockfish-windows-x86-64-avx2.exe"
    : "stockfish-ubuntu-x86-64-avx2";
  return path.resolve(process.cwd(), "bin", "stockfish", defaultBinary);
};

type BotMove = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export const STOCKFISH_BIN_PATH = getBinaryPath();

export default class ChessBot {
  private _engine: StockfishEngine;
  private _difficulty: ChessBotDifficulty;

  constructor(difficulty: ChessBotDifficulty = "medium", stockfishPath: string = STOCKFISH_BIN_PATH) {
    this._difficulty = difficulty;
    this._engine = new StockfishEngine(stockfishPath);
  }

  private _getSearchDepth(): number {
    switch (this._difficulty) {
      case "easy": return 3;
      case "medium": return 8;
      case "hard": return 14;
    }
  }

  public async getBestMove(fen: string, depth: number = this._getSearchDepth()): Promise<BotMove> {
    const output = await this._engine.getBestMove(fen, depth);

    const move: BotMove = {
      from: output.slice(0, 2),
      to: output.slice(2, 4),
      promotion: output[4] as "q" | "r" | "b" | "n" | undefined,
    };

    return move;
  }

  public quit(): void {
    this._engine.quit();
  }
}
