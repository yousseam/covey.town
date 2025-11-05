import { GameArea, GameStatus } from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';

/**
 * Placeholder event types for Chess — expand later when moves are implemented.
 */
export type ChessEvents = GameEventTypes & {
  boardChanged?: () => void; // optional future event
};

/**
 * Minimal placeholder controller for the Chess game area.
 * Lets players interact with the Chess area (pressing space) without crashing.
 * Full game logic (moves, turns, etc.) will be added later.
 */
export default class ChessAreaController extends GameAreaController<any, ChessEvents> {
  /**
   * Returns the status of the game.
   * For now, always WAITING_FOR_PLAYERS (since backend logic isn’t implemented).
   */
  get status(): GameStatus {
    return 'WAITING_FOR_PLAYERS';
  }

  /**
   * Returns true if the current player is in the game.
   * For now, always false until player join logic exists.
   */
  get isPlayer(): boolean {
    return false;
  }

  /**
   * Returns the player whose turn it is — not yet implemented.
   */
  get whoseTurn(): PlayerController | undefined {
    return undefined;
  }

  public isActive(): boolean {
    return false;
  }

  /**
   * Called when backend sends an update.
   * Currently does nothing but can later track board state.
   */
  protected _updateFrom(newModel: GameArea<any>): void {
    super._updateFrom(newModel);
  }

  /**
   * Stub for starting a chess game. Currently throws to show it’s not ready yet.
   */
  public async startGame(): Promise<void> {
    throw new Error(NO_GAME_STARTABLE);
  }

  /**
   * Stub for making a chess move. Currently throws to show it’s not ready yet.
   */
  public async makeMove(): Promise<void> {
    throw new Error(NO_GAME_IN_PROGRESS_ERROR);
  }

  get white(): PlayerController | undefined {
    const whiteID: string | undefined = (this._model as any)?.game?.white;
    return whiteID ? this.occupants.find(p => p.id === whiteID) : undefined;
  }

  get black(): PlayerController | undefined {
    const blackID: string | undefined = (this._model as any)?.game?.black;
    return blackID ? this.occupants.find(p => p.id === blackID) : undefined;
  }

  get winner(): PlayerController | undefined {
    const winnerID: string | undefined = (this._model as any)?.game?.winner;
    return winnerID ? this.occupants.find(p => p.id === winnerID) : undefined;
  }
}
