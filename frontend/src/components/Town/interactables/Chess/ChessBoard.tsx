import React, { useEffect, useState } from 'react';
import { Container, Box, Button, Text, Flex, useToast, chakra } from '@chakra-ui/react';
import ChessAreaController, {
  ChessCell,
} from '../../../../classes/interactable/ChessAreaController';
import { ChessGridPosition } from '../../../../types/CoveyTownSocket';

export type ChessGameProps = {
  gameAreaController: ChessAreaController;
};

const SPRITE_SHEET = '/assets/chess-sprite.png';
const SPRITE_SIZE = 128;
const CELL_SIZE = 48;

const FILES_OG = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const RANKS_OG = [8, 7, 6, 5, 4, 3, 2, 1];

type PieceKey = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

const spriteMap: Record<PieceKey, { x: number; y: number }> = {
  K: { x: 0, y: 0 },
  Q: { x: 1, y: 0 },
  R: { x: 2, y: 0 },
  B: { x: 3, y: 0 },
  N: { x: 4, y: 0 },
  P: { x: 5, y: 0 },
  k: { x: 0, y: 1 },
  q: { x: 1, y: 1 },
  r: { x: 2, y: 1 },
  b: { x: 3, y: 1 },
  n: { x: 4, y: 1 },
  p: { x: 5, y: 1 },
} as const;

/**
 * A component that will render a single cell in the Chess board, styled
 */
const StyledChessSquare = chakra(Button, {
  baseStyle: {
    height: `${CELL_SIZE}px`,
    width: `${CELL_SIZE}px`,
    borderRadius: '0',
    userSelect: 'none',
    _disabled: {
      opacity: '90%'
    }
  },
});

/**
 * A component that will render the Chess board, styled
 */
const StyledChessBoard = chakra(Container, {
  baseStyle: {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    width: `${CELL_SIZE * 8 + 18}px`, // include rank label column
    cursor: 'pointer',
  },
});

const getPieceStyle = (piece: ChessCell) => {
  if (!piece) return {};
  const { x, y } = spriteMap[piece as PieceKey];
  const scale = CELL_SIZE / SPRITE_SIZE;
  const sheetWidth = 6 * SPRITE_SIZE * scale; // 6 sprites per row

  return {
    bgImage: `url(${SPRITE_SHEET})`,
    bgRepeat: 'no-repeat',
    bgSize: `${sheetWidth}px auto`,
    bgPos: `-${x * CELL_SIZE}px -${y * CELL_SIZE}px`,
  } as const;
};

/**
 * A component that renders the Chess board
 *
 * Renders an 8x8 chessboard with sprites.
 * Includes rank (1–8) and file (A–H) labels.
 * White is at the bottom.
 * Uses backend 'makeMove'
 */
export default function ChessBoard({ gameAreaController }: ChessGameProps): JSX.Element {
  const [board, setBoard] = useState<ChessCell[][]>(gameAreaController.board);
  const [isOurTurn, setIsOurTurn] = useState(gameAreaController.isOurTurn);
  const [isNotWhite, setisNotWhite] = useState(gameAreaController.isNotWhite); // used for flipping the board 180 degrees for black player
  const toast = useToast();

  let FILES = isNotWhite ? [...FILES_OG].reverse() : FILES_OG;
  let RANKS = isNotWhite ? [...RANKS_OG].reverse() : RANKS_OG;

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    oldRow: ChessGridPosition;
    oldCol: ChessGridPosition;
    newRow: ChessGridPosition;
    newCol: ChessGridPosition;
  } | null>(null);

  useEffect(() => {
    const handleTurnChanged = (turn: boolean) => setIsOurTurn(turn);
    const handleBoardChanged = (newBoard: ChessCell[][]) => setBoard(newBoard);

    gameAreaController.addListener('turnChanged', handleTurnChanged);
    gameAreaController.addListener('boardChanged', handleBoardChanged);
    gameAreaController.addListener('isNotWhite', setisNotWhite);

    return () => {
      gameAreaController.removeListener('boardChanged', handleBoardChanged);
      gameAreaController.removeListener('turnChanged', handleTurnChanged);
      gameAreaController.removeListener('isNotWhite', setisNotWhite);
    };
  }, [gameAreaController]);

  const isPawnPromotionSquare = (piece: ChessCell, targetRow: number): boolean => {
    if (!piece) return false;
    if (piece === 'P') {
      // White pawn promotes when reaching top row
      return targetRow === 0;
    }
    if (piece === 'p') {
      // Black pawn promotes when reaching bottom row
      return targetRow === 7;
    }
    return false;
  };

  const handleClick = async (row: number, col: number) => {
    if (!isOurTurn) {
      toast({
        title: 'Not your turn',
        status: 'info',
      });
      return;
    }

    if (pendingPromotion) {
      // While promotion UI is open, ignore clicks on the board
      return;
    }

    const piece = board[row][col];

    if (selected) {
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }
      try {
        const oldRow = selected.row as ChessGridPosition;
        const oldCol = selected.col as ChessGridPosition;
        const newRow = row as ChessGridPosition;
        const newCol = col as ChessGridPosition;
        const movingPiece = board[selected.row][selected.col];
        setSelected(null);

        // If this is a pawn move to promotion rank, show promotion UI instead of sending move immediately
        if (isPawnPromotionSquare(movingPiece, newRow)) {
          setPendingPromotion({ oldRow, oldCol, newRow, newCol });
          return;
        }

        // Normal move
        await gameAreaController.makeMove(oldRow, oldCol, newRow, newCol);
      } catch (e) {
        toast({
          title: 'Error making move',
          description: (e as Error).toString(),
          status: 'error',
        });
      }
    } else if (piece) {
      setSelected({ row, col });
    }
  };

  const handlePromotionChoice = async (promotion: 'Q' | 'R' | 'B' | 'N') => {
    if (!pendingPromotion) {
      return;
    }
    try {
      const { oldRow, oldCol, newRow, newCol } = pendingPromotion;
      setPendingPromotion(null);
      await gameAreaController.makeMove(oldRow, oldCol, newRow, newCol, promotion);
    } catch (e) {
      setPendingPromotion(null);
      toast({
        title: 'Error promoting pawn',
        description: (e as Error).toString(),
        status: 'error',
      });
    }
  };

  const disableBoard = !isOurTurn || !!pendingPromotion;

  return (
    <>
      <StyledChessBoard aria-label='Chess Board'>
        {/* Main board with vertical rank labels */}
        {RANKS.map((rank, rIndex) => {
          const row = isNotWhite ? 7 - rIndex : rIndex;
          return (
            <Flex key={rank}>
              {/* Rank numbers along the left side */}
              <Box w='18px' display='flex' alignItems='center' justifyContent='center'>
                <Text fontSize='sm' color='gray.700'>
                  {rank}
                </Text>
              </Box>

              {/* Row of chess squares */}
              {FILES.map((file, fIndex) => {
                const col = isNotWhite ? 7 - fIndex : fIndex;
                const piece = board[row]?.[col] as ChessCell;
                const isDark = (row + col) % 2 === 1;

                const borderStyles = {
                  borderRight: '1px solid black',
                  borderBottom: '1px solid black',
                  ...(rIndex === 0 && { borderTop: '1px solid black' }),
                  ...(fIndex === 0 && { borderLeft: '1px solid black' }),
                };

                const isSelected = selected?.row === row && selected?.col === col;

                return (
                  <StyledChessSquare
                    key={`${rank}${file}`}
                    bg={isSelected ? (isDark ? '#464' : '#cfc') : isDark ? 'gray.600' : 'white'}
                    {...getPieceStyle(piece)}
                    {...borderStyles}
                    onClick={async () => handleClick(row, col)}
                    aria-label={`Cell ${rank}${file}`}
                    colorScheme='none'
                    disabled={disableBoard}
                  />
                );
              })}
            </Flex>
          );
        })}

        {/* File (A–H) labels below the board */}
        <Flex mt={1}>
          <Box w='18px' /> {/* offset for rank numbers */}
          {FILES.map(letter => (
            <Text key={letter} w={`${CELL_SIZE}px`} textAlign='center' fontSize='sm'>
              {letter}
            </Text>
          ))}
        </Flex>
      </StyledChessBoard>

      {/* Basic inline promotion UI (no new imports) */}
      {pendingPromotion && (
        <Flex mt={2} alignItems='center'>
          <Text mr={2}>Promote pawn to:</Text>
          <Button
            size='sm'
            mr={1}
            onClick={() => handlePromotionChoice('Q')}>
            Queen
          </Button>
          <Button
            size='sm'
            mr={1}
            onClick={() => handlePromotionChoice('R')}>
            Rook
          </Button>
          <Button
            size='sm'
            mr={1}
            onClick={() => handlePromotionChoice('B')}>
            Bishop
          </Button>
          <Button
            size='sm'
            onClick={() => handlePromotionChoice('N')}>
            Knight
          </Button>
        </Flex>
      )}
    </>
  );
}
