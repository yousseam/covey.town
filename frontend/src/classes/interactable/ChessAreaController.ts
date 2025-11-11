import {
  ChessGameState,
  ChessGridPosition,
  ChessMove,
  GameArea,
  GameStatus,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';

export type ChessCell =
  | 'K'
  | 'Q'
  | 'R'
  | 'B'
  | 'N'
  | 'P'
  | 'k'
  | 'q'
  | 'r'
  | 'b'
  | 'n'
  | 'p'
  | undefined;
export type ChessEvents = GameEventTypes & {
  boardChanged: (board: ChessCell[][]) => void;
  turnChanged: (isOurTurn: boolean) => void;
  // TODO: implement this
};

/**
 * Minimal placeholder controller for the Chess game area.
 * Lets players interact with the Chess area (pressing space) without crashing.
 * Full game logic (moves, turns, etc.) will be added later.
 */
export default class ChessAreaController extends GameAreaController<ChessGameState, ChessEvents> {
  protected _board: ChessCell[][] = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    Array(8).fill(undefined),
    Array(8).fill(undefined),
    Array(8).fill(undefined),
    Array(8).fill(undefined),
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ];

  /**
   * Returns the current state of the board.
   *
   * The board is a 8x8 array of ChessCell, which is either FENChar or undefined.
   *
   * The 2-dimensional array is indexed by row and then column, so board[0][0] is the top-left cell,
   * and board[7][7] is the bottom-right cell
   */
  get board(): ChessCell[][] {
    return this._board;
  }

  /**
   * Returns the status of the game
   * If there is no game, returns 'WAITING_FOR_PLAYERS'
   */
  get status(): GameStatus {
    const status = this._model.game?.state.status;
    if (!status) {
      return 'WAITING_FOR_PLAYERS';
    }
    return status;
  }

  /**
   * Returns true if the current player is in the game.
   * For now, always false until player join logic exists.
   */
  get isPlayer(): boolean {
    // TODO: implement this
    return false;
  }

  /**
   * Returns the player whose turn it is — not yet implemented.
   */
  get whoseTurn(): PlayerController | undefined {
    // TODO: implement this
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
    // TODO: implement this
    throw new Error(NO_GAME_STARTABLE);
  }

  /**
   * Stub for making a chess move. Currently throws to show it’s not ready yet.
   */
  public async makeMove(
    oldRow: ChessGridPosition,
    oldCol: ChessGridPosition,
    newRow: ChessGridPosition,
    newCol: ChessGridPosition,
  ) {
    const instanceID = this._instanceID;
    if (!instanceID || this._model.game?.state.status !== 'IN_PROGRESS') {
      throw new Error(NO_GAME_IN_PROGRESS_ERROR);
    }
    // TODO: gamePiece getter needs to be defined
    /*await this._townController.sendInteractableCommand(this.id, {
      type: 'GameMove',
      gameID: instanceID,
      move: {
        oldRow,
        oldCol,
        newRow,
        newCol,
        gamePiece: this.gamePiece,
      },
    });*/
  }

  get white(): PlayerController | undefined {
    const white = this._model.game?.state.white;
    if (white) {
      return this.occupants.find(eachOccupant => eachOccupant.id === white);
    }
    return undefined;
  }

  get black(): PlayerController | undefined {
    const black = this._model.game?.state.black;
    if (black) {
      return this.occupants.find(eachOccupant => eachOccupant.id === black);
    }
    return undefined;
  }

  get winner(): PlayerController | undefined {
    const winnerID: string | undefined = (this._model as any)?.game?.winner;
    return winnerID ? this.occupants.find(p => p.id === winnerID) : undefined;
  }

  /**
   * Returns the number of moves that have been made in the game
   */
  get moveCount(): number {
    return this._model.game?.state.moves.length || 0;
  }

  /**
   * Returns true if it is our turn to make a move, false otherwise
   */
  get isOurTurn(): boolean {
    return this.whoseTurn?.id === this._townController.ourPlayer.id;
  }

  /*
  get gamePiece(): FENChar? {
    // TODO: implement this
  }

  isEmpty(): boolean {
    // TODO: implement this
  }
  
  public isActive(): boolean {
    // TODO: implement this
  }

  protected _updateFrom(newModel: GameArea<ChessGameState>): void {
    // TODO: implement this
  }
  
  */
}
