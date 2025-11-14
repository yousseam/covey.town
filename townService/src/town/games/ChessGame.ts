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
import { ChessGameState, ChessMove, GameMove, PlayerID } from '../../types/CoveyTownSocket';
import { Color, Coords, FENChar } from './chess-game-logic/models';
import Game from './Game';

/**
 * A ChessGame is a Game that implements the rules of Chess.
 */

export default class ChessGame extends Game<ChessGameState, ChessMove> {
  public constructor(priorGame?: ChessGame) {
    super({
      moves: [],
      status: 'WAITING_FOR_PLAYERS',
      firstPlayer: 'White',
    });
  }

  protected _join(player: Player): void {
    if (this.state.white === player.id || this.state.black === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.white) {
      this.state = {
        ...this.state,
        status: 'WAITING_FOR_PLAYERS',
        white: player.id,
      };
    } else if (!this.state.black) {
      this.state = {
        ...this.state,
        status: 'WAITING_FOR_PLAYERS',
        black: player.id,
      };
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
    if (this.state.white && this.state.black) {
      this.state.status = 'WAITING_TO_START';
    }
  }

  public startGame(player: Player): void {
    if (this.state.status !== 'WAITING_TO_START') {
      throw new InvalidParametersError(GAME_NOT_STARTABLE_MESSAGE);
    }
    if (this.state.white !== player.id && this.state.black !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    if (this.state.white === player.id) {
      this.state.whiteReady = true;
    }
    if (this.state.black === player.id) {
      this.state.blackReady = true;
    }
    this.state = {
      ...this.state,
      status: this.state.whiteReady && this.state.blackReady ? 'IN_PROGRESS' : 'WAITING_TO_START',
    };
  }

  public applyMove(move: GameMove<ChessMove>): void {
    // TODO: implement this
  }

  protected _applyMove(move: ChessMove): void {
    // TODO: implement this
  }

  protected _validateMove(move: ChessMove): void {
    // TODO: implement this
    // Use external chess.ts library?
  }

  private _checkForGameEnding() {
    // TODO: implement this
  }

  protected _leave(player: Player): void {
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
    switch (this.state.status) {
      case 'WAITING_TO_START':
      case 'WAITING_FOR_PLAYERS':
      case 'OVER':
        this.state = {
          ...this.state,
          status: 'WAITING_FOR_PLAYERS',
          whiteReady: false,
          blackReady: false,
        };
        break;
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
