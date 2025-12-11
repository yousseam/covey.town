/**
 *  Test to track players as white/black
 *  Test to track status of game and winner
 *  Tests join/startGame/leave player commands
 *  Provides endGame() so tests can simulate a finished game
 *  Does not test for chess rules which is covered in ChessGame.test.ts.
 */

import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';
import Player from '../../lib/Player';
import {
  ChessColor,
  ChessMove,
  GameInstanceID,
  GameMove,
  TownEmitter,
} from '../../types/CoveyTownSocket';
import ChessGame from './ChessGame';
import ChessGameArea from './ChessGameArea';
import * as ChessGameModule from './ChessGame';
import { createPlayerForTesting } from '../../TestUtils';
import {
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';

class TestingChessGame extends ChessGame {
  public constructor() {
    super();
    this.state = {
      ...this.state,
      moves: [],
      status: 'WAITING_TO_START',
      firstPlayer: 'White',
    };
    // ChessGameArea only tests that a game exists.
  }

  public override applyMove(_move: GameMove<ChessMove>): void {
    // Area tests only test that this is called with the correct wrapper.
  }

  public endGame(winner?: string) {
    this.state = {
      ...this.state,
      status: 'OVER',
      winner,
    };
  }

  public override startGame(player: Player): void {
    // Mark the player as ready, onlt tests for call wiring.
    if (this.state.white === player.id) {
      this.state.whiteReady = true;
    } else if (this.state.black === player.id) {
      this.state.blackReady = true;
    }
  }

  protected override _join(player: Player): void {
    if (!this.state.white) {
      this.state.white = player.id;
    } else if (!this.state.black) {
      this.state.black = player.id;
    }
    this._players.push(player);
  }

  protected override _leave(_player: Player): void {
    // In this test stub, we don’t adjust white/black on leave;
    // we let endGame() control the winner and status instead.
  }
}

describe('ChessGameArea', () => {
  let gameArea: ChessGameArea;
  let white: Player;
  let black: Player;
  let interactableUpdateSpy: jest.SpyInstance;
  const gameConstructorSpy = jest.spyOn(ChessGameModule, 'default');
  let game: TestingChessGame;

  beforeEach(() => {
    gameConstructorSpy.mockClear();

    game = new TestingChessGame();
    // Test using a double instead of the real class
    gameConstructorSpy.mockReturnValue(game);

    white = createPlayerForTesting();
    black = createPlayerForTesting();

    gameArea = new ChessGameArea(
      nanoid(),
      { x: 0, y: 0, width: 100, height: 100 },
      mock<TownEmitter>(),
    );

    // Occupants for name lookups in history
    gameArea.add(white);
    game.join(white);
    gameArea.add(black);
    game.join(black);

    interactableUpdateSpy = jest.spyOn(
      gameArea as unknown as { _emitAreaChanged: () => void },
      '_emitAreaChanged',
    );
  });

  // JoinGame command Test

  describe('[T4.1] JoinGame command', () => {
    test('when there is no existing game, it should create a new game and call _emitAreaChanged', () => {
      expect(gameArea.game).toBeUndefined();

      const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);

      expect(gameArea.game).toBeDefined();
      expect(gameID).toEqual(game.id);
      expect(interactableUpdateSpy).toHaveBeenCalled();
    });

    test('when there is a game that just ended, it should create a new game and call _emitAreaChanged', () => {
      expect(gameArea.game).toBeUndefined();

      gameConstructorSpy.mockClear();
      const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
      expect(gameArea.game).toBeDefined();
      expect(gameID).toEqual(game.id);
      expect(interactableUpdateSpy).toHaveBeenCalled();
      expect(gameConstructorSpy).toHaveBeenCalledTimes(1);

      // Simulate game end
      game.endGame();

      gameConstructorSpy.mockClear();
      const { gameID: newGameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
      expect(gameArea.game).toBeDefined();
      expect(newGameID).toEqual(game.id);
      expect(interactableUpdateSpy).toHaveBeenCalled();
      expect(gameConstructorSpy).toHaveBeenCalledTimes(1);
    });

    describe('when there is a game in progress', () => {
      it('should call join on the game and call _emitAreaChanged', () => {
        const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }
        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);

        const joinSpy = jest.spyOn(game, 'join');
        const gameID2 = gameArea.handleCommand({ type: 'JoinGame' }, black).gameID;

        expect(joinSpy).toHaveBeenCalledWith(black);
        expect(gameID).toEqual(gameID2);
        expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
      });

      it('should not call _emitAreaChanged if the game throws an error', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, white);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }
        interactableUpdateSpy.mockClear();

        const joinSpy = jest.spyOn(game, 'join').mockImplementationOnce(() => {
          throw new Error('Test Error');
        });

        expect(() => gameArea.handleCommand({ type: 'JoinGame' }, black)).toThrowError(
          'Test Error',
        );
        expect(joinSpy).toHaveBeenCalledWith(black);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });
    });
  });

  // StartGame command Test

  describe('[T4.2] StartGame command', () => {
    it('when there is no game, it should throw an error and not call _emitAreaChanged', () => {
      expect(() =>
        gameArea.handleCommand({ type: 'StartGame', gameID: nanoid() }, white),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      expect(interactableUpdateSpy).not.toHaveBeenCalled();
    });

    describe('when there is a game in progress', () => {
      it('should call startGame on the game and call _emitAreaChanged', () => {
        const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
        interactableUpdateSpy.mockClear();

        gameArea.handleCommand({ type: 'StartGame', gameID }, black);
        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
      });

      it('should not call _emitAreaChanged if the game throws an error', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, white);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }
        interactableUpdateSpy.mockClear();

        const startSpy = jest.spyOn(game, 'startGame').mockImplementationOnce(() => {
          throw new Error('Test Error');
        });

        expect(() =>
          gameArea.handleCommand({ type: 'StartGame', gameID: game.id }, black),
        ).toThrowError('Test Error');
        expect(startSpy).toHaveBeenCalledWith(black);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });

      test('when the game ID mismatches, it should throw an error and not call _emitAreaChanged', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, white);

        interactableUpdateSpy.mockClear();

        expect(() =>
          gameArea.handleCommand({ type: 'StartGame', gameID: nanoid() }, white),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });
    });
  });

  // GameMove command Test

  describe('[T4.3] GameMove command', () => {
    it('should throw an error if there is no game in progress and not call _emitAreaChanged', () => {
      interactableUpdateSpy.mockClear();

      const dummyMove: ChessMove = {
        gamePiece: 'White',
        oldRow: 0,
        oldCol: 0,
        newRow: 0,
        newCol: 1,
      };

      expect(() =>
        gameArea.handleCommand({ type: 'GameMove', move: dummyMove, gameID: nanoid() }, white),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      expect(interactableUpdateSpy).not.toHaveBeenCalled();
    });

    describe('when there is a game in progress', () => {
      let gameID: GameInstanceID;

      beforeEach(() => {
        gameID = gameArea.handleCommand({ type: 'JoinGame' }, white).gameID;
        gameArea.handleCommand({ type: 'JoinGame' }, black);
        interactableUpdateSpy.mockClear();
      });

      it('should throw an error if the gameID does not match the game and not call _emitAreaChanged', () => {
        const move: ChessMove = {
          gamePiece: 'White',
          oldRow: 0,
          oldCol: 0,
          newRow: 0,
          newCol: 1,
        };

        expect(() =>
          gameArea.handleCommand({ type: 'GameMove', move, gameID: nanoid() }, white),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });

      it('should call applyMove on the game and call _emitAreaChanged', () => {
        const move: ChessMove = {
          gamePiece: 'White',
          oldRow: 0,
          oldCol: 0,
          newRow: 0,
          newCol: 1,
        };

        const applyMoveSpy = jest.spyOn(game, 'applyMove');

        gameArea.handleCommand({ type: 'GameMove', move, gameID }, white);

        expect(applyMoveSpy).toHaveBeenCalledWith({
          gameID: game.id,
          playerID: white.id,
          move,
        });
        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
      });

      it('should not call _emitAreaChanged if the game throws an error', () => {
        const move: ChessMove = {
          gamePiece: 'White',
          oldRow: 0,
          oldCol: 0,
          newRow: 0,
          newCol: 1,
        };

        const applyMoveSpy = jest.spyOn(game, 'applyMove');
        applyMoveSpy.mockImplementationOnce(() => {
          throw new Error('Test Error');
        });

        expect(() =>
          gameArea.handleCommand({ type: 'GameMove', move, gameID }, white),
        ).toThrowError('Test Error');

        expect(applyMoveSpy).toHaveBeenCalledWith({
          gameID: game.id,
          playerID: white.id,
          move,
        });
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });

      describe('when the game ends', () => {
        test.each<ChessColor>(['White', 'Black'])(
          'when the game is won by %p',
          (winnerColor: ChessColor) => {
            const finalMove: ChessMove = {
              gamePiece: 'White',
              oldRow: 0,
              oldCol: 0,
              newRow: 0,
              newCol: 1,
            };

            jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
              const winnerPlayer = winnerColor === 'White' ? white : black;
              game.endGame(winnerPlayer.id);
            });

            gameArea.handleCommand({ type: 'GameMove', move: finalMove, gameID }, white);

            expect(game.state.status).toEqual('OVER');
            expect(gameArea.history.length).toEqual(1);

            const winningPlayer = winnerColor === 'White' ? white : black;
            const losingPlayer = winnerColor === 'White' ? black : white;

            expect(gameArea.history[0]).toEqual({
              gameID: game.id,
              scores: {
                [winningPlayer.userName]: 1,
                [losingPlayer.userName]: 0,
              },
            });

            expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
          },
        );

        test('when the game results in a tie', () => {
          const finalMove: ChessMove = {
            gamePiece: 'White',
            oldRow: 0,
            oldCol: 0,
            newRow: 0,
            newCol: 1,
          };

          jest.spyOn(game, 'applyMove').mockImplementationOnce(() => {
            game.endGame();
          });

          gameArea.handleCommand({ type: 'GameMove', move: finalMove, gameID }, white);

          expect(game.state.status).toEqual('OVER');
          expect(gameArea.history.length).toEqual(1);
          expect(gameArea.history[0]).toEqual({
            gameID: game.id,
            scores: {
              [white.userName]: 0,
              [black.userName]: 0,
            },
          });
          expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  // LeaveGame command Test

  describe('[T4.4] LeaveGame command', () => {
    it('should throw an error if there is no game in progress and not call _emitAreaChanged', () => {
      expect(() =>
        gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, white),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      expect(interactableUpdateSpy).not.toHaveBeenCalled();
    });

    describe('when there is a game in progress', () => {
      it('should throw an error if the gameID does not match the game and not call _emitAreaChanged', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, white);
        interactableUpdateSpy.mockClear();

        expect(() =>
          gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, white),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });

      it('should call leave on the game and call _emitAreaChanged', () => {
        const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }

        expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);

        const leaveSpy = jest.spyOn(game, 'leave');

        gameArea.handleCommand({ type: 'LeaveGame', gameID }, white);

        expect(leaveSpy).toHaveBeenCalledWith(white);
        expect(interactableUpdateSpy).toHaveBeenCalledTimes(2);
      });

      it('should not call _emitAreaChanged if the game throws an error', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, white);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }

        interactableUpdateSpy.mockClear();

        const leaveSpy = jest.spyOn(game, 'leave').mockImplementationOnce(() => {
          throw new Error('Test Error');
        });

        expect(() =>
          gameArea.handleCommand({ type: 'LeaveGame', gameID: game.id }, white),
        ).toThrowError('Test Error');

        expect(leaveSpy).toHaveBeenCalledWith(white);
        expect(interactableUpdateSpy).not.toHaveBeenCalled();
      });

      test.each<ChessColor>(['White', 'Black'])(
        'when the game is won by %p due to leave, it updates the history',
        (playerThatWins: ChessColor) => {
          const leavingPlayer = playerThatWins === 'White' ? black : white;
          const winningPlayer = playerThatWins === 'White' ? white : black;

          const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, white);
          gameArea.handleCommand({ type: 'JoinGame' }, black);

          interactableUpdateSpy.mockClear();

          jest.spyOn(game, 'leave').mockImplementationOnce(() => {
            game.endGame(winningPlayer.id);
          });

          gameArea.handleCommand({ type: 'LeaveGame', gameID }, leavingPlayer);

          expect(game.state.status).toEqual('OVER');
          expect(gameArea.history.length).toEqual(1);

          const winningUsername = winningPlayer.userName;
          const losingUsername = leavingPlayer.userName;

          expect(gameArea.history[0]).toEqual({
            gameID: game.id,
            scores: {
              [winningUsername]: 1,
              [losingUsername]: 0,
            },
          });
          expect(interactableUpdateSpy).toHaveBeenCalledTimes(1);
        },
      );
    });
  });

  // Invalid command Test

  test('[T4.5] When given an invalid command it should throw an error', () => {
    expect(() => gameArea.handleCommand({ type: 'InvalidCommand' } as never, white)).toThrowError(
      INVALID_COMMAND_MESSAGE,
    );
    expect(interactableUpdateSpy).not.toHaveBeenCalled();
  });
});
