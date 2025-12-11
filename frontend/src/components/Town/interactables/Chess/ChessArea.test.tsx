import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { mock, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { act } from 'react-dom/test-utils';
import React from 'react';
import ChessAreaController, {
  ChessCell,
} from '../../../../classes/interactable/ChessAreaController';
import PlayerController from '../../../../classes/PlayerController';
import TownController, * as TownControllerHooks from '../../../../classes/TownController';
import TownControllerContext from '../../../../contexts/TownControllerContext';
import { randomLocation } from '../../../../TestUtils';
import { ChessGameState, GameArea, GameStatus } from '../../../../types/CoveyTownSocket';
import PhaserGameArea from '../GameArea';
import ChessArea from './ChessArea';
import * as ChessBoard from './ChessBoard';

const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  const mockUseToast = () => mockToast;
  return { ...ui, useToast: mockUseToast };
});
const mockGameArea = mock<PhaserGameArea>();
mockGameArea.getData.mockReturnValue('Chess');
jest.spyOn(TownControllerHooks, 'useInteractable').mockReturnValue(mockGameArea);
const useInteractableAreaControllerSpy = jest.spyOn(
  TownControllerHooks,
  'useInteractableAreaController',
);

jest.spyOn(ChessBoard, 'default').mockReturnValue(<div data-testid='chessboard' />);

class MockChessAreaController extends ChessAreaController {
  makeMove = jest.fn();

  joinGame = jest.fn();

  startGame = jest.fn();

  joinBotGame = jest.fn();

  mockIsPlayer = false;

  mockWinner: PlayerController | undefined = undefined;

  mockWhoseTurn: PlayerController | undefined = undefined;

  mockIsOurTurn = false;

  mockBoard: ChessCell[][] = [];

  mockStatus: GameStatus = 'WAITING_FOR_PLAYERS';

  mockWhite?: PlayerController;

  mockBlack?: PlayerController;

  mockMoveCount = 0;

  public constructor() {
    super(nanoid(), mock<GameArea<ChessGameState>>(), mock<TownController>());
    this.mockClear();
  }

  get status() {
    return this.mockStatus;
  }

  get white() {
    return this.mockWhite;
  }

  get black() {
    return this.mockBlack;
  }

  get moveCount() {
    return this.mockMoveCount;
  }

  get isOurTurn() {
    return this.mockIsOurTurn;
  }

  get isPlayer() {
    return this.mockIsPlayer;
  }

  get winner(): PlayerController | undefined {
    return this.mockWinner;
  }

  public mockClear() {
    this.mockBoard = [];
    for (let i = 0; i < 8; i++) {
      this.mockBoard.push([]);
      for (let j = 0; j < 8; j++) {
        this.mockBoard[i].push(undefined);
      }
    }
    this.makeMove.mockClear();
  }
}

describe('ChessArea (frontend only)', () => {
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParms: any[]]>;
  beforeAll(() => {
    // Spy on console.error and intercept react key warnings to fail test
    consoleErrorSpy = jest.spyOn(global.console, 'error');
    consoleErrorSpy.mockImplementation((message?, ...optionalParams) => {
      const stringMessage = message as string;
      if (stringMessage.includes && stringMessage.includes('children with the same key,')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      } else if (stringMessage.includes && stringMessage.includes('warning-keys')) {
        throw new Error(stringMessage.replace('%s', optionalParams[0]));
      }
      console.warn(message, ...optionalParams);
    });
  });
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  let ourPlayer: PlayerController;
  const townController = mock<TownController>();
  Object.defineProperty(townController, 'ourPlayer', { get: () => ourPlayer });
  let gameAreaController = new MockChessAreaController();
  let joinGameResolve: () => void;
  let joinGameReject: (err: Error) => void;
  let startGameResolve: () => void;
  let startGameReject: (err: Error) => void;

  function renderChessArea() {
    return render(
      <ChakraProvider>
        <TownControllerContext.Provider value={townController}>
          <ChessArea interactableID={nanoid()} />
        </TownControllerContext.Provider>
      </ChakraProvider>,
    );
  }

  beforeEach(() => {
    ourPlayer = new PlayerController('player x', 'player x', randomLocation());
    mockGameArea.name = nanoid();
    mockReset(townController);
    gameAreaController.mockClear();
    useInteractableAreaControllerSpy.mockReturnValue(gameAreaController);
    gameAreaController = new MockChessAreaController();
    jest
      .spyOn(TownControllerHooks, 'useInteractableAreaController')
      .mockReturnValue(gameAreaController);
    mockToast.mockClear();
    gameAreaController.joinGame.mockReset();
    gameAreaController.makeMove.mockReset();

    gameAreaController.joinGame.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          joinGameResolve = resolve;
          joinGameReject = reject;
        }),
    );
    gameAreaController.startGame.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          startGameResolve = resolve;
          startGameReject = reject;
        }),
    );
  });

  describe('[T3.0] Game Update Listeners', () => {
    it('Registers exactly one listener for gameUpdated and gameEnd events', () => {
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();

      renderChessArea();
      expect(addListenerSpy).toBeCalledTimes(2);
      expect(addListenerSpy).toHaveBeenCalledWith('gameUpdated', expect.any(Function));
      expect(addListenerSpy).toHaveBeenCalledWith('gameEnd', expect.any(Function));
    });
    it('Does not register a listener on every render', () => {
      const removeListenerSpy = jest.spyOn(gameAreaController, 'removeListener');
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();
      removeListenerSpy.mockClear();
      const renderData = renderChessArea();
      expect(addListenerSpy).toBeCalledTimes(2);
      addListenerSpy.mockClear();

      renderData.rerender(
        <ChakraProvider>
          <TownControllerContext.Provider value={townController}>
            <ChessArea interactableID={nanoid()} />
          </TownControllerContext.Provider>
        </ChakraProvider>,
      );

      expect(addListenerSpy).not.toBeCalled();
      expect(removeListenerSpy).not.toBeCalled();
    });
    it('Removes all listeners on unmount', () => {
      const removeListenerSpy = jest.spyOn(gameAreaController, 'removeListener');
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();
      removeListenerSpy.mockClear();
      const renderData = renderChessArea();
      expect(addListenerSpy).toBeCalledTimes(2);
      const addedListeners = addListenerSpy.mock.calls;
      const addedGameUpdateListener = addedListeners.find(call => call[0] === 'gameUpdated');
      const addedGameEndedListener = addedListeners.find(call => call[0] === 'gameEnd');
      expect(addedGameEndedListener).toBeDefined();
      expect(addedGameUpdateListener).toBeDefined();
      renderData.unmount();
      expect(removeListenerSpy).toBeCalledTimes(2);
      const removedListeners = removeListenerSpy.mock.calls;
      const removedGameUpdateListener = removedListeners.find(call => call[0] === 'gameUpdated');
      const removedGameEndedListener = removedListeners.find(call => call[0] === 'gameEnd');
      expect(removedGameUpdateListener).toEqual(addedGameUpdateListener);
      expect(removedGameEndedListener).toEqual(addedGameEndedListener);
    });
    it('Creates new listeners if the gameAreaController changes', () => {
      const removeListenerSpy = jest.spyOn(gameAreaController, 'removeListener');
      const addListenerSpy = jest.spyOn(gameAreaController, 'addListener');
      addListenerSpy.mockClear();
      removeListenerSpy.mockClear();
      const renderData = renderChessArea();
      expect(addListenerSpy).toBeCalledTimes(2);

      gameAreaController = new MockChessAreaController();
      const removeListenerSpy2 = jest.spyOn(gameAreaController, 'removeListener');
      const addListenerSpy2 = jest.spyOn(gameAreaController, 'addListener');

      useInteractableAreaControllerSpy.mockReturnValue(gameAreaController);
      renderData.rerender(
        <ChakraProvider>
          <TownControllerContext.Provider value={townController}>
            <ChessArea interactableID={nanoid()} />
          </TownControllerContext.Provider>
        </ChakraProvider>,
      );
      expect(removeListenerSpy).toBeCalledTimes(2);

      expect(addListenerSpy2).toBeCalledTimes(2);
      expect(removeListenerSpy2).not.toBeCalled();
    });
  });
  describe('[T3.1] Basic Behavior', () => {
    it('renders default layout correctly', () => {
      renderChessArea();
      expect(screen.getByText('Game not yet started.')).toBeInTheDocument();
      expect(screen.getByText('White: (No player yet!)')).toBeInTheDocument();
      expect(screen.getByText('Black: (No player yet!)')).toBeInTheDocument();
      expect(screen.getByText('Join 2-player Game')).toBeInTheDocument();
      expect(screen.getByText('Join Game with Bot')).toBeInTheDocument();
      expect(screen.getByTestId('chessboard')).toBeInTheDocument();
    });
  });
  describe('[T3.2] Join 2-player game button', () => {
    const join2Plabel = 'Join 2-player Game';
    it('Is not shown if the game status is IN_PROGRESS', () => {
      gameAreaController.mockStatus = 'IN_PROGRESS';
      renderChessArea();
      expect(screen.queryByText(join2Plabel)).not.toBeInTheDocument();
    });
    it('Is not shown if the game status is WAITING_TO_START', () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderChessArea();
      expect(screen.queryByText(join2Plabel)).not.toBeInTheDocument();
    });
    it('Is shown if the game status is WAITING_FOR_PLAYERS', () => {
      gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
      renderChessArea();
      expect(screen.queryByText(join2Plabel)).toBeInTheDocument();
    });
    it('Is shown if the game status is OVER', () => {
      gameAreaController.mockStatus = 'OVER';
      renderChessArea();
      expect(screen.queryByText(join2Plabel)).toBeInTheDocument();
    });
    describe('When clicked', () => {
      beforeEach(() => {
        gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
      });
      it('Calls the gameAreaController.joinGame method', () => {
        renderChessArea();
        const button = screen.getByText(join2Plabel);
        fireEvent.click(button);
        expect(gameAreaController.joinGame).toBeCalled();
      });
      it('Displays a toast with the error message if the joinGame method throws an error', async () => {
        gameAreaController.mockIsPlayer = false;
        renderChessArea();
        const button = screen.getByText(join2Plabel);
        fireEvent.click(button);
        expect(gameAreaController.joinGame).toBeCalled();
        const errorMessage = `Testing error message ${nanoid()}`;
        act(() => {
          joinGameReject(new Error(errorMessage));
        });
        await waitFor(() => {
          expect(mockToast).toBeCalledWith(
            expect.objectContaining({
              description: `Error: ${errorMessage}`,
              status: 'error',
            }),
          );
        });
      });
      it('Is disabled and set to loading while the player is joining the game', async () => {
        gameAreaController.mockIsPlayer = false;
        renderChessArea();
        const button = screen.getByText(join2Plabel);
        fireEvent.click(button);
        expect(gameAreaController.joinGame).toBeCalled();

        expect(button).toBeDisabled();
        //Check that the loading text is displayed
        expect(within(button).queryByText('Loading...')).toBeInTheDocument();
        act(() => {
          joinGameResolve();
        });
        await waitFor(() => expect(button).toBeEnabled());
        //Check that the loading text is not displayed
        expect(within(button).queryByText('Loading...')).not.toBeInTheDocument();
      });
      it('Adds the display of the button when a game becomes possible to join', () => {
        //start with 2 players waiting to start
        gameAreaController.mockStatus = 'WAITING_TO_START';
        gameAreaController.mockWhite = new PlayerController(
          'player 1',
          'player 1',
          randomLocation(),
        );
        gameAreaController.mockBlack = new PlayerController(
          'player 2',
          'player 2',
          randomLocation(),
        );
        renderChessArea();
        //button says 'Start Game', not 'Join 2-player game'
        expect(screen.queryByText(join2Plabel)).not.toBeInTheDocument();
        // Black player leaves game, so bring back the Join game button
        act(() => {
          gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
          gameAreaController.mockBlack = undefined;
          gameAreaController.emit('gameUpdated');
        });
        expect(screen.queryByText(join2Plabel)).toBeInTheDocument();
      });
      it('Removes the button after the player has joined the game', () => {
        //black player has joined, but no white
        gameAreaController.mockWhite = undefined;
        gameAreaController.mockBlack = new PlayerController(
          'player 2',
          'player 2',
          randomLocation(),
        );
        renderChessArea();
        //Join 2-player game button is on screen
        expect(screen.queryByText(join2Plabel)).toBeInTheDocument();
        //white player has now joined
        act(() => {
          gameAreaController.mockStatus = 'WAITING_TO_START';
          gameAreaController.mockWhite = ourPlayer;
          gameAreaController.emit('gameUpdated');
        });
        //Join 2-player game button is no longer on screen; replaced with 'Start Game'
        expect(screen.queryByText(join2Plabel)).not.toBeInTheDocument();
      });
    });
  });
  describe('[T3.3] Start game button', () => {
    it('Is not shown if the game status is IN_PROGRESS', () => {
      gameAreaController.mockStatus = 'IN_PROGRESS';
      renderChessArea();
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });
    it('Is not shown if the game status is WAITING_FOR_PLAYERS', () => {
      gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
      renderChessArea();
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });
    it('Removes the button once the game is in progress', () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      gameAreaController.mockWhite = ourPlayer;
      gameAreaController.mockBlack = new PlayerController('player 2', 'player 2', randomLocation());
      gameAreaController.mockIsPlayer = true;
      renderChessArea();
      expect(screen.queryByText('Start Game')).toBeInTheDocument();
      act(() => {
        gameAreaController.mockStatus = 'IN_PROGRESS';
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });
    it('Is shown if the game status is WAITING_TO_START', () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderChessArea();
      expect(screen.queryByText('Start Game')).toBeInTheDocument();
    });
    it('Adds the button when a game becomes possible to start', () => {
      gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
      gameAreaController.mockWhite = ourPlayer;
      gameAreaController.mockIsPlayer = true;
      renderChessArea();
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
      act(() => {
        gameAreaController.mockStatus = 'WAITING_TO_START';
        gameAreaController.mockBlack = new PlayerController(
          'player 2',
          'player 2',
          randomLocation(),
        );
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.queryByText('Start Game')).toBeInTheDocument();
    });
    it('Is disabled and set to loading while the player is starting the game', async () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderChessArea();
      const button = screen.getByText('Start Game');
      fireEvent.click(button);
      expect(gameAreaController.startGame).toBeCalled();

      expect(button).toBeDisabled();
      expect(within(button).queryByText('Loading...')).toBeInTheDocument(); //Check that the loading text is displayed
      act(() => {
        startGameResolve();
      });
      await waitFor(() => expect(button).toBeEnabled());
      expect(within(button).queryByText('Loading...')).not.toBeInTheDocument(); //Check that the loading text is not displayed
    });
    describe('When clicked', () => {
      beforeEach(() => {
        gameAreaController.mockStatus = 'WAITING_TO_START';
        renderChessArea();
        const button = screen.getByText('Start Game');
        fireEvent.click(button);
        expect(gameAreaController.startGame).toBeCalled();
      });

      it('Calls the gameAreaController.startGame method', () => {
        // ^ the last statement of beforeEach
      });

      it('Displays a toast with the error message if the startGame method throws an error', async () => {
        const errorMessage = `Testing error message ${nanoid()}`;
        act(() => {
          startGameReject(new Error(errorMessage));
        });
        await waitFor(() => {
          expect(mockToast).toBeCalledWith(
            expect.objectContaining({
              description: `Error: ${errorMessage}`,
              status: 'error',
            }),
          );
        });
      });
    });
  });
  describe('[T3.4] Players in game text', () => {
    it('Displays the username of the White player if there is one', () => {
      gameAreaController.mockWhite = new PlayerController(nanoid(), nanoid(), randomLocation());
      renderChessArea();
      expect(
        screen.getByText(`White: ${gameAreaController.mockWhite?.userName}`),
      ).toBeInTheDocument();
    });
    it('Displays the username of the Black player if there is one', () => {
      gameAreaController.mockBlack = new PlayerController(nanoid(), nanoid(), randomLocation());
      renderChessArea();
      expect(
        screen.getByText(`Black: ${gameAreaController.mockBlack?.userName}`),
      ).toBeInTheDocument();
    });
    it('Displays the usernames of both players if both are there', () => {
      gameAreaController.mockWhite = new PlayerController(nanoid(), nanoid(), randomLocation());
      gameAreaController.mockBlack = new PlayerController(nanoid(), nanoid(), randomLocation());
      renderChessArea();
      expect(
        screen.getByText(`White: ${gameAreaController.mockWhite?.userName}`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Black: ${gameAreaController.mockBlack?.userName}`),
      ).toBeInTheDocument();
    });

    it('Displays "White: (No player yet!)" if there is no White player', () => {
      gameAreaController.mockWhite = undefined;
      renderChessArea();
      expect(screen.getByText(`White: (No player yet!)`)).toBeInTheDocument();
    });
    it('Displays "Black: (No player yet!)" if there is no Black player', () => {
      gameAreaController.mockBlack = undefined;
      renderChessArea();
      expect(screen.getByText(`Black: (No player yet!)`)).toBeInTheDocument();
    });
    it('Displays both "White: (No player yet!)" and "Black: (No player yet!)" if neither player is there', () => {
      gameAreaController.mockBlack = undefined;
      gameAreaController.mockWhite = undefined;
      renderChessArea();
      expect(screen.getByText(`White: (No player yet!)`)).toBeInTheDocument();
      expect(screen.getByText(`Black: (No player yet!)`)).toBeInTheDocument();
    });
    it('Updates the White player when the game is updated', () => {
      renderChessArea();
      expect(screen.getByText(`White: (No player yet!)`)).toBeInTheDocument();
      gameAreaController.mockWhite = new PlayerController(nanoid(), nanoid(), randomLocation());
      act(() => {
        gameAreaController.emit('gameUpdated');
      });
      expect(
        screen.getByText(`White: ${gameAreaController.mockWhite?.userName}`),
      ).toBeInTheDocument();
    });
    it('Updates the Black player when the game is updated', () => {
      renderChessArea();
      expect(screen.getByText(`Black: (No player yet!)`)).toBeInTheDocument();
      gameAreaController.mockBlack = new PlayerController(nanoid(), nanoid(), randomLocation());
      act(() => {
        gameAreaController.emit('gameUpdated');
      });
      expect(
        screen.getByText(`Black: ${gameAreaController.mockBlack?.userName}`),
      ).toBeInTheDocument();
    });
  });
  describe('[T3.7] Bot game join flow', () => {
    it('opens difficulty menu when clicking Join Game with Bot', () => {
      renderChessArea();

      fireEvent.click(screen.getByText('Join Game with Bot'));

      expect(screen.getByText('Select Difficulty:')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Hard')).toBeInTheDocument();
    });

    it('opens color selection after choosing a difficulty', () => {
      renderChessArea();

      fireEvent.click(screen.getByText('Join Game with Bot'));
      fireEvent.click(screen.getByText('Easy'));

      expect(screen.getByText('Select Side:')).toBeInTheDocument();
      expect(screen.getByText('Play as White')).toBeInTheDocument();
      expect(screen.getByText('Play as Black')).toBeInTheDocument();
    });

    it('calls joinBotGame("White", difficulty) when selecting Play as White', () => {
      renderChessArea();

      fireEvent.click(screen.getByText('Join Game with Bot'));
      fireEvent.click(screen.getByText('Medium'));
      fireEvent.click(screen.getByText('Play as White'));

      expect(gameAreaController.joinBotGame).toHaveBeenCalledWith('White', 'medium');
    });

    it('calls joinBotGame("Black", difficulty) when selecting Play as Black', () => {
      renderChessArea();

      fireEvent.click(screen.getByText('Join Game with Bot'));
      fireEvent.click(screen.getByText('Hard'));
      fireEvent.click(screen.getByText('Play as Black'));

      expect(gameAreaController.joinBotGame).toHaveBeenCalledWith('Black', 'hard');
    });
  });
  const yourTurn = 'Your turn';
  const waitForOpp = 'Waiting for opponent.';
  const notStart = 'Game not yet started.';
  describe('[T3.5] Game status text', () => {
    describe('If the game state is IN_PROGRESS)', () => {
      let statString: string;
      beforeEach(() => {
        gameAreaController.mockStatus = 'IN_PROGRESS';
      });
      it(`Displays '${yourTurn}' when it is this player's turn`, () => {
        gameAreaController.mockIsOurTurn = true;
        statString = yourTurn;
      });
      it(`Displays '${waitForOpp}' when it is not this player's turn`, () => {
        gameAreaController.mockIsOurTurn = false;
        statString = waitForOpp;
      });
      afterEach(() => {
        renderChessArea();
        expect(screen.getByText(statString, { exact: false })).toBeInTheDocument();
      });
    });
    describe(`If the game state is not IN_PROGRESS, display '${notStart}'`, () => {
      it('When the game is waiting to start', () => {
        gameAreaController.mockStatus = 'WAITING_TO_START';
      });
      it('When the game is waiting for players', () => {
        gameAreaController.mockStatus = 'WAITING_FOR_PLAYERS';
      });
      it('When the game is over', () => {
        gameAreaController.mockStatus = 'OVER';
      });
      afterEach(() => {
        renderChessArea();
        expect(screen.getByText(notStart, { exact: false })).toBeInTheDocument();
      });
    });

    it("Indicates the player's turn when the game is updated", () => {
      //our player's turn
      gameAreaController.mockStatus = 'IN_PROGRESS';
      gameAreaController.mockMoveCount = 2;
      gameAreaController.mockWhite = ourPlayer;
      gameAreaController.mockBlack = new PlayerController('player 2', 'player 2', randomLocation());
      gameAreaController.mockIsPlayer = true;
      gameAreaController.mockIsOurTurn = true;
      gameAreaController.mockWhoseTurn = ourPlayer;
      renderChessArea();
      expect(screen.getByText(yourTurn, { exact: false })).toBeInTheDocument();
      //opponent's turn
      act(() => {
        gameAreaController.mockMoveCount = 3;
        gameAreaController.mockWhoseTurn = gameAreaController.black;
        gameAreaController.mockIsOurTurn = false;
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.getByText(waitForOpp, { exact: false })).toBeInTheDocument();
    });

    it('Indicates the game status when the game is updated', () => {
      gameAreaController.mockStatus = 'WAITING_TO_START';
      renderChessArea();
      expect(screen.getByText(notStart, { exact: false })).toBeInTheDocument();

      act(() => {
        gameAreaController.mockStatus = 'IN_PROGRESS';
        gameAreaController.mockIsOurTurn = true;
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.getByText(yourTurn, { exact: false })).toBeInTheDocument();

      act(() => {
        gameAreaController.mockIsOurTurn = false;
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.getByText(waitForOpp, { exact: false })).toBeInTheDocument();

      act(() => {
        gameAreaController.mockStatus = 'OVER';
        gameAreaController.emit('gameUpdated');
      });
      expect(screen.getByText(notStart, { exact: false })).toBeInTheDocument();
    });
  });

  describe('T[3.6] Toasts', () => {
    describe('When the game ends', () => {
      beforeEach(() => {
        renderChessArea();
      });

      const wonToast = `You won the game!`;
      it(`says ${wonToast} if you are the winner`, () => {
        gameAreaController.mockWinner = ourPlayer;
        act(() => {
          gameAreaController.emit('gameEnd');
        });
        expect(mockToast).toBeCalledWith(expect.objectContaining({ description: wonToast }));
      });

      it(`says the opponent won the game if the opponent is the winner`, () => {
        gameAreaController.mockBlack = new PlayerController(
          'player 2',
          'player 2',
          randomLocation(),
        );
        gameAreaController.mockWinner = gameAreaController.mockBlack;
        act(() => {
          gameAreaController.emit('gameEnd');
        });
        expect(mockToast).toBeCalledWith(
          expect.objectContaining({
            description: `${gameAreaController.mockBlack.userName} won the game!`,
          }),
        );
      });

      it(`says the game ended in a draw if there is no winner`, () => {
        gameAreaController.mockWinner = undefined;
        act(() => {
          gameAreaController.emit('gameEnd');
        });
        expect(mockToast).toBeCalledWith(
          expect.objectContaining({ description: 'The game ended in a draw!' }),
        );
      });

      afterEach(() => {
        expect.objectContaining({ title: 'Game over' });
      });
    });
    describe('Errors', () => {
      let titleMessage: string;
      let errorMessage: string;
      it('shows a toast when joinGame fails', async () => {
        titleMessage = 'Error joining game';
        errorMessage = `Test join error ${nanoid()}`;

        gameAreaController.joinGame.mockRejectedValueOnce(new Error(errorMessage));
        renderChessArea();

        const button = screen.getByText('Join 2-player Game');
        fireEvent.click(button);
      });

      it('shows a toast when startGame fails', async () => {
        titleMessage = 'Error starting game';
        errorMessage = `Test start error ${nanoid()}`;

        gameAreaController.startGame.mockRejectedValueOnce(new Error(errorMessage));
        gameAreaController.mockStatus = 'WAITING_TO_START';
        renderChessArea();

        const button = screen.getByText('Start Game');
        fireEvent.click(button);
      });

      afterEach(() => {
        expect(mockToast).toBeCalledWith(
          expect.objectContaining({
            title: titleMessage,
            description: `Error: ${errorMessage}`,
            status: 'error',
          }),
        );
      });
    });
  });
});
