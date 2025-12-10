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
  ChessBotDifficulty,
  ChessColor,
  ChessGridPosition,
} from '../../types/CoveyTownSocket';
import ChessGame from './ChessGame';
import GameArea from './GameArea';
import ChessBot from './ChessBot';

type JoinBotGameCommand = InteractableCommand & {
  type: 'JoinBotGame';
  difficulty?: ChessBotDifficulty;
  color?: ChessColor;
};

function squareToRowCol(square: string): { row: ChessGridPosition; col: ChessGridPosition } {
  const file = square[0];
  const rank = Number(square[1]);
  const col = file.charCodeAt(0) - 'a'.charCodeAt(0) as ChessGridPosition;
  const row = 8 - rank as ChessGridPosition;
  return { row, col };
}

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

  private static readonly _BOT_PLAYER_ID = '_BOT_';

  private _bot?: ChessBot;

  private _isBotGame = false;

  private _botColor: ChessColor = 'Black';

  /**
   * When the game finishes, record the outcome and update the area state
   */
  private _stateUpdated(updatedState: GameInstance<ChessGameState>) {
    if (updatedState.state.status === 'OVER') {

      const gameID = this._game?.id;
      if (gameID) {
        // && !this._history.find(eachResult => eachResult.gameID === gameID)) {
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
   * If this is a bot game and it's now the bot's turn, schedule an async bot move.
   */
  private _scheduleBotMove(game: ChessGame): void {
    if (!this._isBotGame) return;
    if (game.state.status !== 'IN_PROGRESS') return;
    if (game.turnColor !== this._botColor) return;

    const { fen } = game;

    // Fire-and-forget async bot move; do not block the command response
    (async () => {
      const move = await this._bot?.getBestMove(fen);
      if (!move) return;

      const { row: oldRow, col: oldCol } = squareToRowCol(move.from);
      const { row: newRow, col: newCol } = squareToRowCol(move.to);
      const promotion = move.promotion?.toUpperCase() as "Q" | "R" | "B" | "N";

      const botMove: GameMove<ChessMove> = {
        playerID: ChessGameArea._BOT_PLAYER_ID,
        gameID: game.id,
        move: {
          oldRow,
          oldCol,
          newRow,
          newCol,
          promotion,
          gamePiece: this._botColor,
        },
      };

      try {
        game.applyMove(botMove);
        this._stateUpdated(game.toModel());
      } catch {
        // If something goes wrong, just do nothing; the game remains in the last valid state.
      }
    })();
  }

  /**
   * Handle all commands directed at this ChessArea.
   *
   * Supported commands:
   *  - JoinGame: player joins the current game (PvP)
   *  - JoinBotGame: create/join a game vs bot (bot is backend only)
   *  - LeaveGame: player leaves the current game
   *  - StartGame: PvP only (bot games start immediately in configureBotGame)
   *  - GameMove: applies a ChessMove via ChessGame.applyMove; may trigger bot reply
   */
  public handleCommand<CommandType extends InteractableCommand>(
    _command: CommandType,
    _player: Player,
  ): InteractableCommandReturnType<CommandType> {
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

      // After a human move in a bot game, trigger the bot
      if (this._isBotGame) this._scheduleBotMove(game);

      return undefined as InteractableCommandReturnType<CommandType>;
    }

    if (_command.type === 'JoinGame') {
      let game = this._game;
      if (!game || game.state.status === 'OVER' || this._isBotGame) {
        // No game in progress, make a new one
        game = new ChessGame(this._game);
        // cleanup old bot
        if (this._bot) this._bot.quit();
        this._game = game;
        this._bot = undefined;
        this._isBotGame = false;
      }
      game.join(_player);
      this._stateUpdated(game.toModel());
      return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
    }

    if (_command.type === 'JoinBotGame') {
      const cmd = _command as unknown as JoinBotGameCommand;
      const difficulty: ChessBotDifficulty = cmd.difficulty ?? 'medium';
      const humanColor: ChessColor = cmd.color ?? 'White';

      let game = this._game;
      if (!game || game.state.status === 'OVER' || !this._isBotGame) {
        game = new ChessGame();
        this._game = game;
      }

      // Cleanup old bot
      if (this._bot) this._bot.quit();

      this._bot = new ChessBot(difficulty);
      this._isBotGame = true;
      this._botColor = humanColor === 'White' ? 'Black' : 'White';

      // Configure ChessGame so that one seat is the human, the other is the bot ID
      game.configureBotGame(_player, humanColor, ChessGameArea._BOT_PLAYER_ID);
      this._stateUpdated(game.toModel());

      // If is bot's turn, tell it to move immediately
      if (game.turnColor === this._botColor) this._scheduleBotMove(game);

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
      // Bot games are already IN_PROGRESS when configured, so StartGame is PvP only
      if (!this._isBotGame) {
        game.startGame(_player);
        this._stateUpdated(game.toModel());
      }
      return undefined as InteractableCommandReturnType<CommandType>;
    }

    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
