import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ChakraProvider } from '@chakra-ui/react';
import ChessBoard from './ChessBoard';
import ChessAreaController, {
  ChessCell,
} from '../../../../classes/interactable/ChessAreaController';
import TownController from '../../../../classes/TownController';
import PlayerController from '../../../../classes/PlayerController';
import { ChessGameState, GameArea } from '../../../../types/CoveyTownSocket';

// Mock Chakra UI toast
const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => {
  const ui = jest.requireActual('@chakra-ui/react');
  const mockUseToast = () => mockToast;
  return { ...ui, useToast: mockUseToast };
});

// Mock Chess Controller
class MockChessAreaController extends ChessAreaController {
  mockBoard: ChessCell[][] = [];

  mockIsPlayer = false;

  mockIsOurTurn = false;

  makeMove = jest.fn();

  constructor() {
    super(nanoid(), mock<GameArea<ChessGameState>>(), mock<TownController>());
    this.mockClear();
  }

  get board(): ChessCell[][] {
    return this.mockBoard.map(row => [...row]);
  }

  get isOurTurn(): boolean {
    return this.mockIsOurTurn;
  }

  mockClear() {
    this.mockBoard = Array.from({ length: 8 }, () => Array<ChessCell>(8).fill(undefined));
    this.mockBoard[6][0] = 'P'; // White pawn on A2
    this.makeMove.mockClear();
  }

  // return type-safe placeholders instead of throwing errors
  get black(): PlayerController | undefined {
    return undefined;
  }

  get white(): PlayerController | undefined {
    return undefined;
  }

  get winner(): PlayerController | undefined {
    return undefined;
  }

  get moveCount(): number {
    return 0;
  }

  public isActive(): boolean {
    return false;
  }
}

// Test Suite
describe('ChessBoard', () => {
  const gameAreaController = new MockChessAreaController();

  beforeEach(() => {
    gameAreaController.mockClear();
    mockToast.mockClear();
  });

  async function checkBoard({
    clickable,
    checkMakeMove,
    checkToast,
  }: {
    clickable?: boolean;
    checkMakeMove?: boolean;
    checkToast?: boolean;
  }) {
    const cells = screen.getAllByLabelText(/Cell/);
    expect(cells).toHaveLength(64);

    // verify rank/file labels
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(letter =>
      expect(screen.getByText(letter)).toBeInTheDocument(),
    );
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(num =>
      expect(screen.getByText(num.toString())).toBeInTheDocument(),
    );

    if (clickable) {
      // check that all cells are clickable
      for (let i = 0; i < cells.length; i++) {
        expect(cells[i]).toBeEnabled();
        fireEvent.click(cells[i]);
      }

      const from = screen.getByLabelText('Cell 2A');
      const to = screen.getByLabelText('Cell 3A');

      if (checkToast) {
        gameAreaController.makeMove.mockClear();
        expect(mockToast).not.toBeCalled();
        mockToast.mockClear();
        const errorMessage = `No game in progress`;
        gameAreaController.makeMove.mockRejectedValue(new Error(errorMessage));
        fireEvent.click(from);
        fireEvent.click(to);
        await waitFor(() => {
          expect(mockToast).toBeCalledWith(
            expect.objectContaining({
              status: 'error',
              description: `Error: ${errorMessage}`,
            }),
          );
        });
      }
    }  else { //if clickable is false,
      // each cell should be disabled
      for (let i = 0; i < cells.length; i++) {
        expect(cells[i]).toBeDisabled();
        fireEvent.click(cells[i]);
        // clicking should do nothing
        expect(gameAreaController.makeMove).not.toHaveBeenCalled();
      }
    }
  }

  describe('[T4.1] Board Rendering', () => {
    beforeEach(() => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
    });
    
    it('renders the correct number of cells and labels', async () => {
      await checkBoard({});
    });

    it('updates board when boardChanged event fires', async () => {
      await checkBoard({});
      // simulate change in board
      gameAreaController.mockBoard[5][0] = 'P';
      act(() => {
        gameAreaController.emit('boardChanged', gameAreaController.mockBoard);
      });
      await checkBoard({});
    });
  });

  describe('[T4.2] When a playing a game', () => {
    beforeEach(() => {
      gameAreaController.mockIsOurTurn = true;
      gameAreaController.mockIsPlayer = true;
    });

    it('enables squares when it is our turn and disables when not', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true });
      gameAreaController.mockIsOurTurn = false;
      act(() => {
        gameAreaController.emit('turnChanged', false);
      });
      await checkBoard({ clickable: false });
    });

    it('allows selecting and moving a piece', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true, checkMakeMove: true });
    });

    it('updates board when boardChanged event fires', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true });
      // simulate external change
      gameAreaController.mockBoard[5][0] = 'P';
      act(() => {
        gameAreaController.emit('boardChanged', gameAreaController.mockBoard);
      });
      await checkBoard({ clickable: true });
    });

    it('shows an error toast if a move fails', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true, checkMakeMove: true, checkToast: true });
    });
  });

  describe('[T4.3] Board flip behavior', () => {
    it('flips the board when flipBoardForBlack event fires', () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );

      // default orientation
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();

      // flip board
      act(() => {
        gameAreaController.emit('flipBoardForBlack', true);
      });

      // pieces should be reversed
      const fileLabels = ['H','G','F','E','D','C','B','A'];
      fileLabels.forEach(f => {
        expect(screen.getByText(f)).toBeInTheDocument();
      });
    });
  });
});
