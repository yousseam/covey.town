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
    // TODO: implement this

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
      // TODO: implement this
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
