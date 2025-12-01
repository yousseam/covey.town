import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import ChessAreaController from './ChessAreaController';
import { NO_GAME_IN_PROGRESS_ERROR, NO_GAME_STARTABLE } from './GameAreaController';
import { GameArea } from '../../types/CoveyTownSocket';

describe('ChessAreaController (placeholder)', () => {
  const ourPlayer = new PlayerController(nanoid(), nanoid(), {
    x: 0,
    y: 0,
    moving: false,
    rotation: 'front',
  });
  const otherPlayers = [
    new PlayerController(nanoid(), nanoid(), { x: 0, y: 0, moving: false, rotation: 'front' }),
  ];
  const mockTownController = mock<TownController>();
  Object.defineProperty(mockTownController, 'ourPlayer', { get: () => ourPlayer });

  function createController(withGame = false): ChessAreaController {
    const id = `CHESS-${nanoid()}`;
    return new ChessAreaController(
      id,
      {
        id,
        occupants: [ourPlayer.id],
        type: 'ChessArea',
        history: [],
        game: withGame
          ? {
              id: `GAME-${nanoid()}`,
              players: [ourPlayer.id],
              state: {
                status: 'IN_PROGRESS',
                white: ourPlayer.id,
                black: otherPlayers[0]?.id,
                firstPlayer: 'White',
                moves: [],
              },
            }
          : undefined,
      },
      mockTownController,
    );
  }

  describe('board initialization', () => {
    it('creates an 8x8 board with correct starting layout', () => {
      const controller = createController();
      expect(controller.board.length).toBe(8);
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

  describe('default properties', () => {
    it('returns WAITING_FOR_PLAYERS if no game state', () => {
      const controller = createController(false);
      expect(controller.status).toBe('WAITING_FOR_PLAYERS');
    });

    it('returns 0 moveCount when no moves exist', () => {
      const controller = createController();
      expect(controller.moveCount).toBe(0);
    });

    it('white, black, and winner are undefined without IDs', () => {
      const controller = createController(false);
      expect(controller.white).toBeUndefined();
      expect(controller.black).toBeUndefined();
      expect(controller.winner).toBeUndefined();
    });
  });

  describe('stubbed methods', () => {
    //TODO: un-stub these
    it('throws NO_GAME_STARTABLE for startGame()', async () => {
      const controller = createController();
      await expect(controller.startGame()).rejects.toThrowError(NO_GAME_STARTABLE);
    });

    it('throws NO_GAME_IN_PROGRESS_ERROR for makeMove()', async () => {
      const controller = createController(false);
      await expect(controller.makeMove(0, 0, 1, 0)).rejects.toThrowError(NO_GAME_IN_PROGRESS_ERROR);
    });
  });

  describe('basic behavior', () => {
    it('does not crash when calling _updateFrom', () => {
      const controller = createController();
      const newModel: GameArea<any> = { ...controller.toInteractableAreaModel() };
      expect(() => controller.updateFrom(newModel, [ourPlayer, ...otherPlayers])).not.toThrow();
    });

    it('returns false for isActive() and isPlayer()', () => {
      const controller = createController();
      expect(controller.isActive()).toBe(false);
      expect(controller.isPlayer).toBe(false);
    });
  });
});
