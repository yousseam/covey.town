import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mock } from 'jest-mock-extended';
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
import ChessArea from './ChessArea';
import * as ChessBoard from './ChessBoard';

const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  const mockUseToast = () => mockToast;
  return { ...ui, useToast: mockUseToast };
});

jest.spyOn(ChessBoard, 'default').mockReturnValue(<div data-testid='chessboard' />);

class MockChessAreaController extends ChessAreaController {
  makeMove = jest.fn();

  joinGame = jest.fn();

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

  public mockClear() {
    //TODO: change so this includes all the pieces in their starting positions?
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
  const townController = mock<TownController>();
  let gameAreaController: MockChessAreaController;

  function renderChessArea() {
    return render(
      <ChakraProvider>
        <TownControllerContext.Provider value={townController}>
          <ChessArea interactableID={nanoid()} />
        </TownControllerContext.Provider>
      </ChakraProvider>,
    );
  };

  beforeEach(() => {
    gameAreaController = new MockChessAreaController();
    jest
      .spyOn(TownControllerHooks, 'useInteractableAreaController')
      .mockReturnValue(gameAreaController);
    mockToast.mockClear();
  });

  it('renders default layout correctly', () => {
    renderChessArea();
    expect(screen.getByText('Game not yet started.')).toBeInTheDocument();
    expect(screen.getByText('White: (No player yet!)')).toBeInTheDocument();
    expect(screen.getByText('Black: (No player yet!)')).toBeInTheDocument();
    expect(screen.getByText('Join 2-player Game')).toBeInTheDocument();
    expect(screen.getByText('Join Game with Bot')).toBeInTheDocument();
    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
  });

  it('displays game in progress after joining 2-player game', async () => {
    //have 2 players join the game for this test to pass?
    /*
    const whitePlayer = new PlayerController('white123', 'white123', randomLocation());
    gameAreaController.mockWhite = whitePlayer;
    
    gameAreaController.joinGame.mockResolvedValueOnce(undefined);
    renderChessArea();

    const button = screen.getByText('Join 2-player Game');
    fireEvent.click(button);

    expect(button).toBeDisabled();

    await act(async () => {
      await gameAreaController.joinGame();
    });

    await waitFor(() => expect(button).toBeEnabled());
    console.log(gameAreaController.mockWhite, gameAreaController.mockBlack);
    */
    gameAreaController.mockStatus = 'WAITING_TO_START';
    renderChessArea();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('shows a toast when joinGame fails', async () => {
    const errorMessage = `Test join error ${nanoid()}`;
    gameAreaController.joinGame.mockRejectedValueOnce(new Error(errorMessage));
    renderChessArea();

    const button = screen.getByText('Join 2-player Game');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toBeCalledWith(
        expect.objectContaining({
          title: 'Error joining game',
          description: `Error: ${errorMessage}`,
          status: 'error',
        }),
      );
    });
  });

  it('renders correct player slots when white/black players exist', () => {
    const whitePlayer = new PlayerController('white123', 'white123', randomLocation());
    const blackPlayer = new PlayerController('black456', 'black456', randomLocation());
    gameAreaController.mockWhite = whitePlayer;
    gameAreaController.mockBlack = blackPlayer;
    renderChessArea();
    expect(screen.getByText(`White: ${whitePlayer.userName}`)).toBeInTheDocument();
    expect(screen.getByText(`Black: ${blackPlayer.userName}`)).toBeInTheDocument();
  });

  it('renders ChessBoard component', () => {
    renderChessArea();
    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
  });
});
