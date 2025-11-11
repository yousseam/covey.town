import React, { useEffect, useState } from 'react';
import { Container, Box, Text, Flex, useToast, chakra } from '@chakra-ui/react';
import ChessAreaController, { ChessCell } from '../../../../classes/interactable/ChessAreaController';
import { ChessGridPosition } from '../../../../types/CoveyTownSocket';

export type ChessGameProps = {
  gameAreaController: ChessAreaController;
};

const SPRITE_SHEET = "/assets/chess-sprite.png";
const SPRITE_SIZE = 128;
const CELL_SIZE = 48;

const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

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
const StyledChessSquare = chakra(Box, {
  baseStyle: {
    height: `${CELL_SIZE}px`,
    width: `${CELL_SIZE}px`,
    userSelect: 'none',
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
  const { x, y } = spriteMap[piece];
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
 * Renders an 8x8 static chessboard with sprites.
 * Includes rank (1–8) and file (A–H) labels.
 * White is at the bottom. No game logic yet — purely visual.
 */

export default function ChessBoard({ gameAreaController }: ChessGameProps): JSX.Element {
  const [board, setBoard] = useState<ChessCell[][]>(gameAreaController.board);
  const [isOurTurn, setIsOurTurn] = useState(gameAreaController.isOurTurn);
  const toast = useToast();
  useEffect(() => {
    gameAreaController.addListener('turnChanged', setIsOurTurn);
    gameAreaController.addListener('boardChanged', setBoard);
    return () => {
      gameAreaController.removeListener('boardChanged', setBoard);
      gameAreaController.removeListener('turnChanged', setIsOurTurn);
    };
  }, [gameAreaController]);

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const handleClick = async (row: number, col: number) => {
    const piece = board[row][col];

    if (selected) {
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }
      try {
        const oldRow = selected.row as ChessGridPosition;
        const oldCol = selected.col as ChessGridPosition;
        const newRow = row as ChessGridPosition
        const newCol = col as ChessGridPosition
        setSelected(null);
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

  return (
    <StyledChessBoard aria-label="Chess Board">
      {/* Main board with vertical rank labels */}
      {ranks.map((rank, rIndex) => (
        <Flex key={rank}>
          {/* Rank numbers along the left side */}
          <Box w="18px" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="sm" color="gray.700">
              {rank}
            </Text>
          </Box>

          {/* Row of chess squares */}
          {files.map((file, fIndex) => {
            const piece = board[rIndex][fIndex] as ChessCell;
            const isDark = (rIndex + fIndex) % 2 === 1;

            const borderStyles = {
              borderRight: '1px solid black',
              borderBottom: '1px solid black',
              ...(rIndex === 0 && { borderTop: '1px solid black' }),
              ...(fIndex === 0 && { borderLeft: '1px solid black' }),
            };

            const isSelected = selected?.row === rIndex && selected?.col === fIndex;

            return (
              <StyledChessSquare
                key={`${rank}${file}`}
                bg={isSelected ? (isDark ? '#464' : '#cfc') : (isDark ? 'gray.600' : 'white')}
                {...getPieceStyle(piece)}
                {...borderStyles}
                onClick={async () => await handleClick(rIndex, fIndex)}
                aria-label={`Cell ${rank}${file}`}
              />
            );
          })}
        </Flex>
      ))}

      {/* File (A–H) labels below the board */}
      <Flex mt={1}>
        <Box w="18px" /> {/* offset for rank numbers */}
        {files.map((letter) => (
          <Text key={letter} w={`${CELL_SIZE}px`} textAlign="center" fontSize="sm">
            {letter}
          </Text>
        ))}
      </Flex>
    </StyledChessBoard>
  );
}
