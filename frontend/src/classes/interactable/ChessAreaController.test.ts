import assert from 'assert';
import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import ChessAreaController from './ChessAreaController';
import GameAreaController, { NO_GAME_IN_PROGRESS_ERROR, NO_GAME_STARTABLE, PLAYER_NOT_IN_GAME_ERROR } from './GameAreaController';
import { GameArea,
  ChessMove,
  ChessColor,
  ChessGridPosition,
  GameResult,
  GameStatus,
} from '../../types/CoveyTownSocket';
import exp from 'constants';

describe('ChessAreaController', () => {
  const ourPlayer = new PlayerController(nanoid(), nanoid(), {
    x: 0,
    y: 0,
    moving: false,
    rotation: 'front',
  });
  const otherPlayers = [
    new PlayerController(nanoid(), nanoid(), { x: 0, y: 0, moving: false, rotation: 'front' }),
    new PlayerController(nanoid(), nanoid(), { x: 0, y: 0, moving: false, rotation: 'front' }),
  ];
  const mockTownController = mock<TownController>();
  Object.defineProperty(mockTownController, 'ourPlayer', {
    get: () => ourPlayer,
  });
  Object.defineProperty(mockTownController, 'players', {
    get: () => [ourPlayer, ...otherPlayers],
  });
  mockTownController.getPlayer.mockImplementation(playerID => {
    const p = mockTownController.players.find(player => player.id === playerID);
    assert(p);
    return p;
  });
  function updateGameWithMove(
    controller: ChessAreaController,
    nextMove: ChessMove,
  ): void {
    const nextState = Object.assign({}, controller.toInteractableAreaModel());
    const nextGame = Object.assign({}, nextState.game);
    nextState.game = nextGame;
    const newState = Object.assign({}, nextGame.state);
    nextGame.state = newState;
    newState.moves = newState.moves.concat([nextMove]);
    controller.updateFrom(nextState, controller.occupants);
  }
  function createController
  ({
      _id,
      history,
      white,
      black,
      undefinedGame,
      status,
      moves,
      gameInstanceID,
      winner,
      firstPlayer,
      observers,
    }: {
      _id?: string;
      history?: GameResult[];
      white?: string;
      black?: string;
      undefinedGame?: boolean;
      status?: GameStatus;
      gameInstanceID?: string;
      moves?: ChessMove[];
      winner?: string;
      firstPlayer?: ChessColor;
      observers?: string[];
    }) {
      const id = _id || `INTERACTABLE-ID-${nanoid()}`;
      const instanceID = gameInstanceID || `GAME-INSTANCE-ID-${nanoid()}`;
      const players = [];
      if (white) players.push(white);
      if (black) players.push(black);
      if (observers) players.push(...observers);
      const ret = new ChessAreaController(
        id,
        {
          id,
          occupants: players,
          history: history || [],
          type: 'ChessArea',
          game: undefinedGame
            ? undefined
            : {
                id: instanceID,
                players: players,
                state: {
                  status: status || 'IN_PROGRESS',
                  white: white,
                  black: black,
                  moves: moves || [],
                  winner: winner,
                  firstPlayer: firstPlayer || 'White',
                },
              },
        },
        mockTownController,
      );
      if (players) {
        ret.occupants = players
          .map(eachID => mockTownController.players.find(eachPlayer => eachPlayer.id === eachID))
          .filter(eachPlayer => eachPlayer) as PlayerController[];
      }
      return ret;
    }

  describe('[T1.1] Properties at the start of the game', () => {
    describe('board', () => {
      it('returns an 8x8 board with correct initialized layout', () => {
        const controller = createController({});
        expect(controller.board.length).toBe(8);
        
        expect(controller.board).toStrictEqual([
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ]);
      
        for (const row of controller.board) expect(row.length).toBe(8);
        expect(controller.board[0][0]).toBe('r');
        expect(controller.board[0][1]).toBe('n');
        expect(controller.board[0][2]).toBe('b');
        expect(controller.board[0][3]).toBe('q');
        expect(controller.board[0][4]).toBe('k');
        expect(controller.board[0][5]).toBe('b');
        expect(controller.board[0][6]).toBe('n');
        expect(controller.board[0][7]).toBe('r');

        expect(controller.board[1].every(cell => cell === 'p')).toBe(true);
        expect(controller.board[2].every(cell => cell === undefined)).toBe(true);
        expect(controller.board[3].every(cell => cell === undefined)).toBe(true);
        expect(controller.board[4].every(cell => cell === undefined)).toBe(true);
        expect(controller.board[5].every(cell => cell === undefined)).toBe(true);
        expect(controller.board[6].every(cell => cell === 'P')).toBe(true);

        expect(controller.board[7][0]).toBe('R');
        expect(controller.board[7][1]).toBe('N');
        expect(controller.board[7][2]).toBe('B');
        expect(controller.board[7][3]).toBe('Q');
        expect(controller.board[7][4]).toBe('K');
        expect(controller.board[7][5]).toBe('B');
        expect(controller.board[7][6]).toBe('N');
        expect(controller.board[7][7]).toBe('R');
      });
    });

    describe('white', () => {
      it('returns the white player if there is a white player', () => {
        const controller = createController({ white: ourPlayer.id });
        expect(controller.white).toBe(ourPlayer);
      });
      it('returns undefined if there is no white player', () => {
        const controller = createController({});
        expect(controller.white).toBeUndefined();
      });
    });
    describe('black', () => {
      it('returns the black player if there is a black player', () => {
        const controller = createController({ black: ourPlayer.id });
        expect(controller.black).toBe(ourPlayer);
      });
      it('returns undefined if there is no black player', () => {
        const controller = createController({});
        expect(controller.black).toBeUndefined();
      });
    });

    describe('isNotWhite', () => {
      it('returns true if white is in this game and this player is black', () => {
        const controller = createController({ white: otherPlayers[0].id, black: ourPlayer.id });
        expect(controller.isNotWhite).toBe(true);
      })
      it('returns true if white is in this game and this player has not joined', () => {
        const controller = createController({ white: otherPlayers[0].id, black: undefined });
        expect(controller.isNotWhite).toBe(true);
      })
      it('returns false if this player is white', () => {
        const controller = createController({ white: ourPlayer.id });
        expect(controller.isNotWhite).toBe(false);
        const controller2 = createController({ white: ourPlayer.id, black: otherPlayers[0].id });
        expect(controller2.isNotWhite).toBe(false);
      })
      it('returns false if white is not in this game', () => {
        const controller = createController({});
        expect(controller.isNotWhite).toBe(false);
        const controller2 = createController({ black: ourPlayer.id });
        expect(controller2.isNotWhite).toBe(false);
      })
    })
    
    describe('winner', () => {
      it('returns the white player if the white player is the winner', () => {
        const controller = createController({ 
          white: ourPlayer.id,
          winner: ourPlayer.id
        });
        expect(controller.winner).toBe(controller.white);
        expect(controller.winner).toBe(ourPlayer);
      });
      it('returns the black player if the black player is the winner', () => {
        const controller = createController({ 
          black: ourPlayer.id,
          winner: ourPlayer.id
        });
        expect(controller.winner).toBe(controller.black);
        expect(controller.winner).toBe(ourPlayer);
      });
      it('returns undefined if there is no winner', () => {
        const controller = createController({});
        expect(controller.winner).toBeUndefined();
      });
    });

    describe('moveCount', () => {
      it('returns 0 moveCount when no moves exist', () => {
        const moves: ChessMove[] = [];
        const controller = createController({ moves });
        expect(controller.moveCount).toBe(0);
      });

      it('returns the number of moves made in the game', () => {
        const moves: ChessMove[] = [
          { oldRow: 1, oldCol: 0, newRow: 3, newCol: 0, gamePiece: 'White' },
          { oldRow: 6, oldCol: 0, newRow: 4, newCol: 0, gamePiece: 'Black' },
        ];
        const controller = createController({ moves });
        expect(controller.moveCount).toBe(moves.length);
      });
    });

    describe('isOurTurn', () => {
      it('returns true if it is our turn', () => {
        const controller = createController({
          white: ourPlayer.id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[0].id,
        });
        expect(controller.isOurTurn).toBe(true);
      });
      it('returns false if it is not our turn', () => {
        const controller = createController({
          white: otherPlayers[0].id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: ourPlayer.id,
        });
        expect(controller.isOurTurn).toBe(false);
      });
      it('returns false if we are not a player', () => {
        const controller = createController({
          white: otherPlayers[0].id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[1].id,
        });
        expect(controller.isOurTurn).toBe(false);
      });
      it('returns false if there is no game in progress', () => {
        const controller = createController({});
        expect(controller.isOurTurn).toBe(false);
      });
    });

    describe('whoseTurn', () => {
      it('returns white if it\'s the white player\'s turn', () => {
        const controller = createController({
          white: ourPlayer.id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[0].id,
        });
        expect(controller.whoseTurn).toBe(controller.white);
      });
      it('returns black if it\'s the black player\'s turn', () => {
        const moves: ChessMove[] = [
          { oldRow: 1, oldCol: 0, newRow: 3, newCol: 0, gamePiece: 'White' },
        ];
        const controller = createController({
          white: ourPlayer.id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[0].id,
          moves: moves, // start with white, and make one white move
        });
        expect(controller.whoseTurn).toBe(controller.black);
      });
      it('returns undefined if there is no current turn (e.g., no players)', () => {
        const controller = createController({});
        expect(controller.whoseTurn).toBeUndefined();
      });
      it('returns the white player after an even number of moves', () => {
        const moves: ChessMove[] = [
          { oldRow: 1, oldCol: 0, newRow: 3, newCol: 0, gamePiece: 'White' },
          { oldRow: 6, oldCol: 0, newRow: 4, newCol: 0, gamePiece: 'Black' },
        ];
        const controller = createController({
          white: ourPlayer.id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[0].id,
          moves: moves,
        });
        expect(controller.whoseTurn).toBe(controller.white);
      });
      it('returns the black player after an odd number of moves', () => {
        const moves: ChessMove[] = [
          { oldRow: 1, oldCol: 0, newRow: 3, newCol: 0, gamePiece: 'White' },
          { oldRow: 6, oldCol: 0, newRow: 4, newCol: 0, gamePiece: 'Black' },
          { oldRow: 1, oldCol: 1, newRow: 3, newCol: 1, gamePiece: 'White' },
        ];
        const controller = createController({
          white: ourPlayer.id,
          firstPlayer: 'White',
          status: 'IN_PROGRESS',
          black: otherPlayers[0].id,
          moves: moves,
        });
        expect(controller.whoseTurn).toBe(controller.black);
      });
    });

    describe('isPlayer', () => {
      it('returns true if we are the white player', () => {
        const controller = createController({ white: ourPlayer.id });
        expect(controller.isPlayer).toBe(true);
      });
      it('returns true if we are the black player', () => {
        const controller = createController({ black: ourPlayer.id });
        expect(controller.isPlayer).toBe(true);
      });
      it('returns false if we are not a player', () => {
        const controller = createController({ white: otherPlayers[0].id, black: otherPlayers[1].id });
        expect(controller.isPlayer).toBe(false);
      });
      it('returns false if there is no game in progress', () => {
        const controller = createController({});
        expect(controller.isPlayer).toBe(false);
      });
    });

    describe('isEmpty', () => {
      it('returns true if there are no players', () => {
        const controller = createController({ white: undefined });
        expect(controller.isEmpty()).toBe(true);
      });
      it('returns false if there is a single white player', () => {
        const controller = createController({ white: ourPlayer.id });
        expect(controller.isEmpty()).toBe(false);
      });
      it('returns false if there is a single black player', () => {
        const controller = createController({ black: ourPlayer.id });
        expect(controller.isEmpty()).toBe(false);
      });
      it('returns false if there are multiple players', () => {
        const controller = createController({
          white: ourPlayer.id,
          black: otherPlayers[0].id,
        });
        expect(controller.isEmpty()).toBe(false);
      });
      it('returns false if there are no players but there are observers', () => {
        const controller = createController({ observers: [ourPlayer.id] });
        expect(controller.isEmpty()).toBe(false);
      });
    });

    describe('isActive', () => {
      it('returns true if the game is not empty and it is not waiting for players', () => {
        const controller = createController({
          white: ourPlayer.id,
          black: otherPlayers[0].id,
          status: 'IN_PROGRESS',
        });
        expect(controller.isActive()).toBe(true);
      });
      it('returns false if the game is empty', () => {
        const controller = createController({});
        expect(controller.isActive()).toBe(false);
      });
      it('returns false if the game is waiting for players', () => {
        const controller = createController({status: 'WAITING_FOR_PLAYERS'});
        expect(controller.isActive()).toBe(false);
      });
    });

    describe('status', () => {
      it('should return the status of the game', () => {
        const controller = createController({
          status: 'IN_PROGRESS',
        });
        expect(controller.status).toBe('IN_PROGRESS');
      });
      it('should return WAITING_TO_START if the game is not defined', () => {
        const controller = createController({
          undefinedGame: true,
        });
        expect(controller.status).toBe('WAITING_FOR_PLAYERS');
      });
    });
  });

  describe('[T1.2] Properties during the game, modified by _updateFrom', () => {
    let controller: ChessAreaController;
        beforeEach(() => {
          controller = createController({
            white: ourPlayer.id,
            black: otherPlayers[0].id,
            status: 'IN_PROGRESS',
          });
        });
        it('does not crash when calling _updateFrom', () => {
          const newModel: GameArea<any> = { ...controller.toInteractableAreaModel() };
          expect(() => controller.updateFrom(newModel, [ourPlayer, ...otherPlayers])).not.toThrow();
        });
        it('returns the correct board after a move', () => {
          expect(controller.board).toStrictEqual([
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
          ]);
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          expect(controller.board).toStrictEqual([
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            [undefined, 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            ['p', undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
          ]);

          updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
          expect(controller.board).toStrictEqual([
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            [undefined, 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            ['p', undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            ['P', undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
          ]);
        });

        it('emits a boardChange event if the board has changed', () => {
          const spy = jest.fn();
          controller.addListener('boardChanged', spy);
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 1,
            newRow: 3,
            newCol: 1,
            gamePiece: 'White',
          });
          expect(spy).toHaveBeenCalledWith(controller.board);
        });

        it('does not emit a boardChange event if the board has not changed', () => {
          const spy = jest.fn();
          controller.addListener('boardChanged', spy);
          controller.updateFrom(
            { ...controller.toInteractableAreaModel() },
            otherPlayers.concat(ourPlayer),
          );
          expect(spy).not.toHaveBeenCalled();
        });
        it('Calls super.updateFrom with the correct parameters', () => {
          //eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore - we are testing spying on a private method
          const spy = jest.spyOn(GameAreaController.prototype, '_updateFrom');
          const model = controller.toInteractableAreaModel();
          controller.updateFrom(model, otherPlayers.concat(ourPlayer));
          expect(spy).toHaveBeenCalledWith(model);
        });

    describe('updating whoseTurn and isOurTurn', () => {
      describe('when White moves and we are White', () => {
        beforeEach(() => {
          controller = createController({
            white: ourPlayer.id,
            black: otherPlayers[0].id,
            status: 'IN_PROGRESS',
            firstPlayer: 'White',
          });
        });
        it("returns White and true if it is White's turn", () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
          expect(controller.whoseTurn).toBe(ourPlayer);
          expect(controller.isOurTurn).toBe(true);
        });
        it("returns Black and false if it is Black's turn", () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          expect(controller.whoseTurn).toBe(otherPlayers[0]);
          expect(controller.isOurTurn).toBe(false);
        });
      });
      describe('when White moves and we are Black', () => {
        beforeEach(() => {
          controller = createController({
            black: ourPlayer.id,
            white: otherPlayers[0].id,
            status: 'IN_PROGRESS',
            firstPlayer: 'White',
          });
        });
        it("returns White and false if it is White's turn", () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
          expect(controller.whoseTurn).toBe(otherPlayers[0]);
          expect(controller.isOurTurn).toBe(false);
        });
        it("returns Black and true if it is Black's turn", () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          expect(controller.whoseTurn).toBe(ourPlayer);
          expect(controller.isOurTurn).toBe(true);
        });
      });
      describe('when Black moves and we are White', () => {
        beforeEach(() => {
          controller = createController({
            black: ourPlayer.id,
            white: otherPlayers[0].id,
            status: 'IN_PROGRESS',
            firstPlayer: 'White',
          });
        });
        it('returns Black and true if it is Black turn', () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          expect(controller.whoseTurn).toBe(ourPlayer);
          expect(controller.isOurTurn).toBe(true);
        });
        it('returns White and false if it is White turn', () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
          expect(controller.whoseTurn).toBe(otherPlayers[0]);
          expect(controller.isOurTurn).toBe(false);
        });
      });
      describe('when Black moves and we are Black', () => {
        beforeEach(() => {
          controller = createController({
            white: ourPlayer.id,
            black: otherPlayers[0].id,
            status: 'IN_PROGRESS',
            firstPlayer: 'White',
          });
        });
        it('returns Black and false if it is Black turn', () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          expect(controller.whoseTurn).toBe(otherPlayers[0]);
          expect(controller.isOurTurn).toBe(false);
        });
        it('returns White and true if it is White turn', () => {
          updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
          updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
          expect(controller.whoseTurn).toBe(ourPlayer);
          expect(controller.isOurTurn).toBe(true);
        });
      });
    });
    describe('emitting boardChanged events', () => {
      it('emits a boardChanged event if the board has changed', () => {
        expect(controller.board).toStrictEqual([
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ]);
        const spy = jest.fn();
        controller.addListener('boardChanged', spy);
        updateGameWithMove(controller, {
          oldRow: 1,
          oldCol: 0,
          newRow: 3,
          newCol: 0,
          gamePiece: 'White',
        });
        expect(spy).toHaveBeenCalledWith(controller.board);
      });
      it('does not emit a boardChanged event if the turn has not changed', () => {
        expect(controller.board).toStrictEqual([
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
          ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ]);
        const spy = jest.fn();
        controller.addListener('boardChanged', spy);
        updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 1,
            newCol: 0,
            gamePiece: 'White',
          });
        expect(spy).toHaveBeenCalledTimes(0)
      });
    });
    describe('emitting turnChanged events', () => {
      it('emits a turnChanged event if the turn has changed', () => {
        expect(controller.isOurTurn).toBe(true);
        const spy = jest.fn();
        controller.addListener('turnChanged', spy);
        updateGameWithMove(controller, {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          });
        expect(controller.isOurTurn).toBe(false);
        expect(spy).toHaveBeenCalledWith(false);
        spy.mockClear();
        updateGameWithMove(controller, {
            oldRow: 6,
            oldCol: 0,
            newRow: 4,
            newCol: 0,
            gamePiece: 'Black',
          });
        expect(controller.isOurTurn).toBe(true);
        expect(spy).toHaveBeenCalledWith(true);
      });
      it('does not emit a turnChanged event if the turn has not changed', () => {
        expect(controller.isOurTurn).toBe(true);
        const spy = jest.fn();
        controller.addListener('turnChanged', spy);
        controller.updateFrom(controller.toInteractableAreaModel(), [ourPlayer, otherPlayers[0]]);
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });

  describe('[T1.3] startGame', () => {
    it('sends a StartGame command to the server', async () => {
      const controller = createController({
        white: ourPlayer.id,
        black: otherPlayers[0].id,
        status: 'WAITING_TO_START',
      });
      const instanceID = nanoid();
      mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {
        return { gameID: instanceID };
      });
      await controller.joinGame();

      mockTownController.sendInteractableCommand.mockClear();
      mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {});
      await controller.startGame();
      expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
        type: 'StartGame',
        gameID: instanceID,
      });
    });
    it('Does not catch any errors from the server', async () => {
      const controller = createController({
        white: ourPlayer.id,
        black: otherPlayers[0].id,
        status: 'WAITING_TO_START',
      });
      const instanceID = nanoid();
      mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {
        return { gameID: instanceID };
      });
      await controller.joinGame();

      mockTownController.sendInteractableCommand.mockClear();
      const uniqueError = `Test Error ${nanoid()}`;
      mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {
        throw new Error(uniqueError);
      });
      await expect(() => controller.startGame()).rejects.toThrowError(uniqueError);
      expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
        type: 'StartGame',
        gameID: instanceID,
      });
    });
    it('throws an error if the game is not startable', async () => {
      const controller = createController({
        white: ourPlayer.id,
        black: otherPlayers[0].id,
        status: 'IN_PROGRESS',
      });
      const instanceID = nanoid();
      mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {
        return { gameID: instanceID };
      });
      await controller.joinGame();
      mockTownController.sendInteractableCommand.mockClear();
      await expect(controller.startGame()).rejects.toThrowError(NO_GAME_STARTABLE);
      expect(mockTownController.sendInteractableCommand).not.toHaveBeenCalled();
    });
    it('throws an error if there is no instanceid', async () => {
      const controller = createController({
        white: ourPlayer.id,
        black: otherPlayers[0].id,
        status: 'WAITING_TO_START',
      });
      mockTownController.sendInteractableCommand.mockClear();
      await expect(controller.startGame()).rejects.toThrowError(NO_GAME_STARTABLE);
      expect(mockTownController.sendInteractableCommand).not.toHaveBeenCalled();
    });
  });
  describe('[T1.4] makeMove', () => {
    describe('With no game in progress', () => {
      it('Throws an error if there is no id', async () => {
        const controller = createController({});
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore - modify a protected variable
        controller._instanceID = undefined
        await expect(() => controller.makeMove(1, 0, 3, 0,)).rejects.toThrowError(NO_GAME_IN_PROGRESS_ERROR);
      });
      it('Throws an error if there is no game', async () => {
        const controller = createController({
          undefinedGame: true,
        });
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore - modify a protected variable
        controller._instanceID = nanoid()
        await expect(() => controller.makeMove(1, 0, 3, 0,)).rejects.toThrowError(NO_GAME_IN_PROGRESS_ERROR);
      });
      it('Throws an error if game status is not IN_PROGRESS', async () => {
        const controller = createController({
          white: ourPlayer.id,
          black: otherPlayers[0].id,
          status: 'WAITING_TO_START',
        });
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore - modify a protected variable
        controller._instanceID = nanoid()
        await expect(() => controller.makeMove(1, 0, 3, 0,)).rejects.toThrowError(NO_GAME_IN_PROGRESS_ERROR);
      });
    });
    describe('With a game in progress that this user is not in', () => {
      it('Throws an error if this player is not in the game', async () => {
        const controller = createController({
          white: otherPlayers[0].id,
          black: otherPlayers[1].id,
          status: 'IN_PROGRESS',
        });
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore - modify a protected variable
        controller._instanceID = nanoid()
        await expect(() => controller.makeMove(1, 0, 3, 0,)).rejects.toThrowError(PLAYER_NOT_IN_GAME_ERROR);
      });
    });
    describe('With a game in progress', () => {
      it('Throws an error if it is not this player\'s turn', async () => {
        const controller = createController({
          white: otherPlayers[0].id,
          black: ourPlayer.id,
          status: 'IN_PROGRESS',
        });
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore - modify a protected variable
        controller._instanceID = nanoid()
        await expect(() => controller.makeMove(1, 0, 3, 0,)).rejects.toThrowError('Not your turn');
      });
      it('Should call townController.sendInteractableCommand', async () => {
        const controller = createController({
          status: 'IN_PROGRESS',
          white: ourPlayer.id,
          black: otherPlayers[0].id,
        });
        // Simulate joining the game for real
        const instanceID = nanoid();
        mockTownController.sendInteractableCommand.mockImplementationOnce(async () => {
          return { gameID: instanceID };
        });
        await controller.joinGame();
        mockTownController.sendInteractableCommand.mockReset();
        await controller.makeMove(1, 0, 3, 0,);
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'GameMove',
          gameID: instanceID,
          move: {
            oldRow: 1,
            oldCol: 0,
            newRow: 3,
            newCol: 0,
            gamePiece: 'White',
          },
        });
      });
    });
  });
});