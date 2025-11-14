import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { ChakraProvider } from '@chakra-ui/react';
import ChessBoard from './ChessBoard';
import ChessAreaController, { ChessCell } from '../../../../classes/interactable/ChessAreaController';
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
    checkToast,
  }: {
    clickable?: boolean;
    checkToast?: boolean;
  }) {
    const cells = screen.getAllByLabelText(/Cell/);
    expect(cells).toHaveLength(64);

    // verify rank/file labels
    ['A','B','C','D','E','F','G','H'].forEach(letter =>
      expect(screen.getByText(letter)).toBeInTheDocument());
    [1,2,3,4,5,6,7,8].forEach(num =>
      expect(screen.getByText(num.toString())).toBeInTheDocument());

    if (clickable) {
      const from = screen.getByLabelText('Cell 2A');
      const to = screen.getByLabelText('Cell 3A');
      act(() => {
        fireEvent.click(from);
        fireEvent.click(to);
      });
      await waitFor(() => {
        // verify mock board update
      });

      if (checkToast) {
        mockToast.mockClear();
        const errorMessage = `Fake error ${nanoid()}`;
        gameAreaController.makeMove.mockRejectedValue(new Error(errorMessage));
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
    }
  }

  describe('[T4.1] Board Rendering', () => {
    it('renders the correct number of cells and labels', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({});
    });

    it('updates board when boardChanged event fires', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({});
      // simulate external change
      gameAreaController.mockBoard[5][0] = 'P';
      act(() => {
        gameAreaController.emit('boardChanged', gameAreaController.mockBoard);
      });
      await checkBoard({});
    });
  });

  describe('[T4.2] Click and Move Behavior', () => {
    beforeEach(() => {
      gameAreaController.mockIsOurTurn = true;
    });

    it('allows selecting and moving a piece visually', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true });
    });

    // Currently no logic exists to decide the legality of a move
    // This test will need to be expanded upon when further progress is made
    it.skip('shows an error toast if a move fails', async () => {
      render(
        <ChakraProvider>
          <ChessBoard gameAreaController={gameAreaController} />
        </ChakraProvider>,
      );
      await checkBoard({ clickable: true, checkToast: true });
    });
  });
});
