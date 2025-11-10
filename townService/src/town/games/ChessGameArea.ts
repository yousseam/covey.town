/* eslint-disable @typescript-eslint/no-explicit-any */
import InvalidParametersError, { INVALID_COMMAND_MESSAGE } from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  ChessGameState,
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
} from '../../types/CoveyTownSocket';
import ChessGame from './ChessGame';
import GameArea from './GameArea';

/* Once the backend logic is ready <any> will be replaced by 
   <ChessGame> */
export default class ChessGameArea extends GameArea<any> {
  protected getType(): InteractableType {
    return 'ChessArea';
  }

  private _stateUpdated(updatedState: GameInstance<ChessGameState>) {
    if (updatedState.state.status === 'OVER') {
      // If we haven't yet recorded the outcome, do so now.
      const gameID = this._game?.id;
      if (gameID && !this._history.find(eachResult => eachResult.gameID === gameID)) {
        const { white, black } = updatedState.state;
        if (white && black) {
          const whiteName =
            this._occupants.find(eachPlayer => eachPlayer.id === white)?.userName || white;
          const blackName =
            this._occupants.find(eachPlayer => eachPlayer.id === black)?.userName || black;
          this._history.push({
            gameID,
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

  /* Minimal stub: satisfy abstract method so the backend can boot. 
    For now our handleCommand function throws an error for any interaction */
  public handleCommand<CommandType extends InteractableCommand>(
    _command: CommandType,
    _player: Player,
  ): InteractableCommandReturnType<CommandType> {
    // No chess backend yet — reject all commands for now.

    if (_command.type === 'GameMove') {
      // TODO: implement this
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
      // TODO: implement this
    }
    if (_command.type === 'StartGame') {
      // TODO: implement this
    }

    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
/* This file will have to be expanded upon it serves as a temporary placeholder
   so frontend tasks can be completed. The file defines the ChessGameArea class and
   allows the backend to recognize and load 'Chess' areas without crashing, despite
   our full backend logic being incomplete */
