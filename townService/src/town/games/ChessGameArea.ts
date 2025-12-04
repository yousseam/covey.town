/* eslint-disable @typescript-eslint/no-explicit-any */
import InvalidParametersError, {
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  ChessGameState,
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  ChessMove,
  GameMove,
} from '../../types/CoveyTownSocket';
import ChessGame from './ChessGame';
import GameArea from './GameArea';

/**
 * ChessGameArea is the server-side wrapper around a ChessGame.
 *
 *  Creates a new ChessGame when players join.
 *  Routes commands from clients (JoinGame, LeaveGame, StartGame, GameMove) to the appropriate methods on ChessGame.
 *  Updates the stored game model and game history when the game ends.
 */
export default class ChessGameArea extends GameArea<ChessGame> {
  protected getType(): InteractableType {
    return 'ChessArea';
  }

  /**
   * When the game finishes, record the outcome and update the area state
   */
  private _stateUpdated(updatedState: GameInstance<ChessGameState>) {
    if (updatedState.state.status === 'OVER') {
      const gameID = this._game?.id;
      if (gameID) { //&& !this._history.find(eachResult => eachResult.gameID === gameID)) {
        /** Other condition ("no previous game has the same gameID") is commented out
         * because for some reason if the first two players from the client exit the client
         * and then two new players join, the gameID is the same as the previous game.
         * This results in the second game's outcome not being recorded in the history (and thus the leaderboard).
         * (following games are assigned new gameIDs as expected though)
         * I have no idea why this issue happens with our Chess code but not with ConnectFourGameArea.ts or TicTacToeGameArea.ts
        */
        const { white, black } = updatedState.state;
        if (white && black) {
          const whiteName =
            this._occupants.find(eachPlayer => eachPlayer.id === white)?.userName || white;
          const blackName =
            this._occupants.find(eachPlayer => eachPlayer.id === black)?.userName || black;
            this._history.push({
            gameID,
            // update players' scores
            scores: {
              [whiteName]: updatedState.state.winner === white ? 1 : 0,
              [blackName]: updatedState.state.winner === black ? 1 : 0,
            },
          });
        }
      }
    }

    this._emitAreaChanged();
  }

  /**
   * Handle all commands directed at this ChessArea.
   *
   * Supported commands:
   *  - JoinGame: player joins the current game (or starts a new one)
   *  - LeaveGame: player leaves the current game
   *  - StartGame: marks player ready; when both ready, the game starts
   *  - GameMove: applies a ChessMove via ChessGame.applyMove
   */
  public handleCommand<CommandType extends InteractableCommand>(
    _command: CommandType,
    _player: Player,
  ): InteractableCommandReturnType<CommandType> {
    // No chess backend yet — reject all commands for now.

    /**
     * Depending on the command type,
     * call the appropriate method on the ChessGame instance
     * and update the game state accordingly
     */
    if (_command.type === 'GameMove') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (game.id !== _command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }

      // Build the GameMove<ChessMove> wrapper expected by ChessGame.applyMove
      const moveCommand: GameMove<ChessMove> = {
        playerID: _player.id,
        gameID: _command.gameID,
        move: _command.move as ChessMove,
      };

      game.applyMove(moveCommand);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    if (_command.type === 'JoinGame') {
      let game = this._game;
      if (!game || game.state.status === 'OVER') {
        // No game in progress, make a new one
        game = new ChessGame(this._game);
        this._game = game;
      }
      game.join(_player);
      this._stateUpdated(game.toModel());
      return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
    }

    if (_command.type === 'LeaveGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (game.id !== _command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.leave(_player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    if (_command.type === 'StartGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (game.id !== _command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.startGame(_player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
