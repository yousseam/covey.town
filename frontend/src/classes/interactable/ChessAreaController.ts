import _ from 'lodash';
import {
  ChessGameState,
  ChessGridPosition,
  ChessMove,
  GameArea as ChessGameAreaModel,
  GameStatus,
  ChessColor,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';

const NOT_YOUR_TURN_ERROR = 'Not your turn';

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
  isNotWhite: (isNotWhite: boolean) => void;
  // TODO: implement this
};

/**
 * Controller for a Chess game area on the client.
 * Keeps a local board view, tracks whose turn it is, and sends
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

  private _forceIsNotWhite: boolean | null = null;

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
   * True if the current client player is one of the game players (white or black)
   */
  get isPlayer(): boolean {
    const state = this._model.game?.state;
    if (!state) {
      return false;
    }
    const ourID = this._townController.ourPlayer.id;
    return state.white === ourID || state.black === ourID;
  }

  /**
   * Returns the PlayerController whose turn it currently is, or undefined if
   * the game is not in progress.
   */
  get whoseTurn(): PlayerController | undefined {
    const game = this._model.game;
    if (!game || !(game.state) || game.state.status !== 'IN_PROGRESS') {
      return undefined;
    }
    const movesSoFar = game.state.moves.length;
    const first = game.state.firstPlayer;

    // White moves on even, Black moves on odd
    const whiteToMove = first === 'White' ? movesSoFar % 2 === 0 : movesSoFar % 2 === 1;
    return whiteToMove ? this.white : this.black;
  }

  /**
   * Returns true if this game is active for us (we are a player and the game is in progress)
   */
  public isActive(): boolean {
    return this.isPlayer && this.status === 'IN_PROGRESS';
  }

  /**
   * Called whenever the backend sends an updated GameArea model.
   * We mirror the game state into a local board.
   */
  protected _updateFrom(newModel: ChessGameAreaModel<ChessGameState>): void {
    const wasOurTurn = this.whoseTurn?.id === this._townController.ourPlayer.id;
    super._updateFrom(newModel);

    // Emit isNotWhite event so ChessBoard can update board orientation while the board is already open
    const isNotWhite = this.isNotWhite;
    this.emit('isNotWhite', isNotWhite);
    /** TODO: (if we ever implement functions in this file for joining and leaving game,
     * put these lines for emitting isNotWhite in those functions instead of here
     * so that isNotWhite is only emitted when a player joins/leaves the game
     * and not every time the game state updates in any way)
     */

    const game = newModel.game;
    if (!game) {
      // No game instance, reset board to initial position
      this._board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        Array(8).fill(undefined),
        Array(8).fill(undefined),
        Array(8).fill(undefined),
        Array(8).fill(undefined),
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
      ];
      this.emit('boardChanged', this._board);
      this.emit('turnChanged', false);
      return;
    }

    // Start from a fresh initial board and replay all moves from state
    const newBoard: ChessCell[][] = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      Array(8).fill(undefined),
      Array(8).fill(undefined),
      Array(8).fill(undefined),
      Array(8).fill(undefined),
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ];

    for (const mv of game.state.moves) {
      const { oldRow, oldCol, newRow, newCol, promotion, gamePiece } = mv;
      const movingPiece = newBoard[oldRow][oldCol];

      // Clear source square
      newBoard[oldRow][oldCol] = undefined;

      // Handle promotion
      if (promotion && movingPiece && (movingPiece === 'P' || movingPiece === 'p')) {
        const isWhite = gamePiece === 'White';
        const promoLetter = promotion; // 'Q' | 'R' | 'B' | 'N'
        const promoPiece = (isWhite ? promoLetter : promoLetter.toLowerCase()) as ChessCell;
        newBoard[newRow][newCol] = promoPiece;
      } else {
        // Normal move, just move the piece
        newBoard[newRow][newCol] = movingPiece;
      }
    }

    if (!_.isEqual(newBoard, this._board)) {
      this._board = newBoard;
      this.emit('boardChanged', this._board);
    }
    const isOurTurn = this.whoseTurn?.id === this._townController.ourPlayer.id;
    if (wasOurTurn != isOurTurn) this.emit('turnChanged', isOurTurn);
  }

  /**
   * Return the PlayerController of the white player
   * Return undefined if no white player
   */
  get white(): PlayerController | undefined {
    const white = this._model.game?.state.white;
    if (white) {
      return this.occupants.find(eachOccupant => eachOccupant.id === white);
    }
    return undefined;
  }

  /**
   * Return the PlayerController of the black player
   * Return undefined if no black player
   */
  get black(): PlayerController | undefined {
    const black = this._model.game?.state.black;
    if (black) {
      return this.occupants.find(eachOccupant => eachOccupant.id === black);
    }
    return undefined;
  }

  /**
   * Returns true if white is in the game, but that player is not this player
   * Used for ChessBoard.tsx so that if a white player has already joined,
   * and this player has yet to join or has joined as the black player,
   * then flip the board 180 degrees
   */
  get isNotWhite(): boolean {
    if (this._forceIsNotWhite !== null) {
      return this._forceIsNotWhite;
    }
    return !!this.white && this.white?.id !== this._townController.ourPlayer.id;
  }

  /**
   * Return the PlayerController of the winner
   * Return undefined if there is no winner yet
   */
  get winner(): PlayerController | undefined {
    const winnerID: string | undefined = this._model.game?.state.winner;
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

  /**
   * Sends a request to the server to start the game.
   *
   * If the game is not in the WAITING_TO_START state, throws an error.
   *
   * @throws an error with message NO_GAME_STARTABLE if there is no game waiting to start
   */
  public async startGame(): Promise<void> {
    const instanceID = this._instanceID;
    if (!instanceID || this._model.game?.state.status !== 'WAITING_TO_START') {
      throw new Error(NO_GAME_STARTABLE);
    }
    await this._townController.sendInteractableCommand(this.id, {
      gameID: instanceID,
      type: 'StartGame',
    });
  }

  /**
   * Sends a ChessMove to the backend.
   */
  public async makeMove(
    oldRow: ChessGridPosition,
    oldCol: ChessGridPosition,
    newRow: ChessGridPosition,
    newCol: ChessGridPosition,
    promotion?: 'Q' | 'R' | 'B' | 'N',
  ): Promise<void> {
    const instanceID = this._instanceID;
    const game = this._model.game;

    if (!instanceID || !game || game.state.status !== 'IN_PROGRESS') {
      throw new Error(NO_GAME_IN_PROGRESS_ERROR);
    }

    const state = game.state;
    const ourID = this._townController.ourPlayer.id;

    if (ourID !== state.white && ourID !== state.black) {
      throw new Error(PLAYER_NOT_IN_GAME_ERROR);
    }

    const whose = this.whoseTurn;
    if (!whose || whose.id !== ourID) {
      throw new Error(NOT_YOUR_TURN_ERROR);
    }

    const gamePiece: ChessColor = whose === this.white ? 'White' : 'Black';

    await this._townController.sendInteractableCommand(this.id, {
      type: 'GameMove',
      gameID: instanceID,
      move: {
        oldRow,
        oldCol,
        newRow,
        newCol,
        gamePiece,
        ...(promotion ? { promotion } : {}),
      } as ChessMove,
    });
  }

  public async joinBotGame(
    color: ChessColor,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<void> {
    this._forceIsNotWhite = (color === 'Black');
    this.emit('isNotWhite', this._forceIsNotWhite);

    await this._townController.sendInteractableCommand(this.id, {
      type: 'JoinBotGame',
      color,
      difficulty,
    });
  }
}