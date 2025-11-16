import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { act } from 'react-dom/test-utils';
import ChessArea from './ChessArea';
import ChessAreaController from '../../../../classes/interactable/ChessAreaController';
import PlayerController from '../../../../classes/PlayerController';
import TownController, * as TownControllerHooks from '../../../../classes/TownController';
import TownControllerContext from '../../../../contexts/TownControllerContext';
import { randomLocation } from '../../../../TestUtils';
import { GameArea, GameStatus } from '../../../../types/CoveyTownSocket';
import * as ChessBoard from './ChessBoard';

const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  return { ...ui, useToast: () => mockToast };
});

jest.spyOn(ChessBoard, 'default').mockReturnValue(<div data-testid="chessboard" />);

class MockChessAreaController extends ChessAreaController {
  joinGame = jest.fn();
  mockStatus: GameStatus = 'WAITING_FOR_PLAYERS';
  mockWhite?: PlayerController;
  mockBlack?: PlayerController;
  mockMoveCount = 0;

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
}

describe('ChessArea (frontend only)', () => {
  const townController = mock<TownController>();
  let gameAreaController: MockChessAreaController;

  const renderChessArea = () => {
    return render(
      <ChakraProvider>
        <TownControllerContext.Provider value={townController}>
          <ChessArea interactableID={nanoid()} />
        </TownControllerContext.Provider>
      </ChakraProvider>,
    );
  };

  beforeEach(() => {
    gameAreaController = new MockChessAreaController(
      nanoid(),
      mock<GameArea<any>>(),
      mock<TownController>(),
    );
    jest.spyOn(TownControllerHooks, 'useInteractableAreaController').mockReturnValue(
      gameAreaController,
    );
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
    gameAreaController.joinGame.mockResolvedValueOnce(undefined);
    renderChessArea();

    const button = screen.getByText('Join 2-player Game');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText('Game in progress.')).toBeInTheDocument();

    await act(async () => {
      await gameAreaController.joinGame();
    });

    await waitFor(() => expect(button).toBeEnabled());
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

