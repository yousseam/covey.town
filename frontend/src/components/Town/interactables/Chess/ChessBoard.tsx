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
      opacity: '75%',
    },
    _focus: {
      boxShadow: 'none'
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
  const [flipBoardForBlack, setflipBoardForBlack] = useState(gameAreaController.flipBoardForBlack); // used for flipping the board 180 degrees for black player
  const toast = useToast();
  const [legalTargets, setLegalTargets] = useState<{ row: number; col: number }[]>([]);

  // if the player is black, display the board, files, and ranks upside down
  const files = flipBoardForBlack ? [...FILES_OG].reverse() : FILES_OG;
  const ranks = flipBoardForBlack ? [...RANKS_OG].reverse() : RANKS_OG;

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    oldRow: ChessGridPosition;
    oldCol: ChessGridPosition;
    newRow: ChessGridPosition;
    newCol: ChessGridPosition;
  } | null>(null);

  useEffect(() => {
    const handleTurnChanged = (turn: boolean) => setIsOurTurn(turn);
    const handleBoardChanged = (newBoard: ChessCell[][]) => {
      setBoard(newBoard);
      setSelected(null);
      setLegalTargets([]);
    };

    gameAreaController.addListener('turnChanged', handleTurnChanged);
    gameAreaController.addListener('boardChanged', handleBoardChanged);
    gameAreaController.addListener('flipBoardForBlack', setflipBoardForBlack);

    return () => {
      gameAreaController.removeListener('boardChanged', handleBoardChanged);
      gameAreaController.removeListener('turnChanged', handleTurnChanged);
      gameAreaController.removeListener('flipBoardForBlack', setflipBoardForBlack);
    };
  }, [gameAreaController]);

  const isPawnPromotionSquare = (piece: ChessCell, oldRow: number, targetRow: number): boolean => {
    if (!piece) return false;
    if (piece === 'P' && oldRow === 1) {
      // White pawn promotes when reaching top row
      return targetRow === 0;
    }
    if (piece === 'p' && oldRow === 6) {
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

    // If a square is already selected
    if (selected) {
      // Clicking the same square again: deselect & clear highlights
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      // Attempt to move to clicked square BUT only if it's one of the legal targets
      const isLegal = legalTargets.some(t => t.row === row && t.col === col);
      if (!isLegal) {
        // re-select new piece if it belongs to us
        if (piece) {
          // switch selection; also load new legal moves for that piece
          try {
            const fromRow = row as ChessGridPosition;
            const fromCol = col as ChessGridPosition;
            const moves = await gameAreaController.getLegalMoves(fromRow, fromCol);
            setSelected({ row, col });
            setLegalTargets(moves);
          } catch (e) {
            toast({
              title: 'Error fetching moves',
              description: (e as Error).toString(),
              status: 'error',
            });
          }
        } else {
          setSelected(null);
          setLegalTargets([]);
        }
        return;
      }

      // Perform the move
      try {
        const oldRow = selected.row as ChessGridPosition;
        const oldCol = selected.col as ChessGridPosition;
        const newRow = row as ChessGridPosition;
        const newCol = col as ChessGridPosition;
        const movingPiece = board[selected.row][selected.col];

        setSelected(null);
        setLegalTargets([]);

        // If this is a pawn move to promotion rank, show promotion UI instead of sending move immediately
        if (isPawnPromotionSquare(movingPiece, oldRow, newRow)) {
          setPendingPromotion({ oldRow, oldCol, newRow, newCol });
          return;
        }

        // Make move
        await gameAreaController.makeMove(oldRow, oldCol, newRow, newCol);
      } catch (e) {
        toast({
          title: 'Error making move',
          description: (e as Error).toString(),
          status: 'error',
        });
      }

      return;
    }

    // No square selected yet: select a piece and fetch its legal moves
    if (piece) {
      try {
        const fromRow = row as ChessGridPosition;
        const fromCol = col as ChessGridPosition;
        const moves = await gameAreaController.getLegalMoves(fromRow, fromCol);
        setSelected({ row, col });
        setLegalTargets(moves);
      } catch (e) {
        toast({
          title: 'Error fetching moves',
          description: (e as Error).toString(),
          status: 'error',
        });
      }
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

  const promotionPieces: Array<'Q' | 'R' | 'B' | 'N'> = ['Q', 'R', 'B', 'N'];

  const isWhitePromotion = pendingPromotion
    ? board[pendingPromotion.oldRow][pendingPromotion.oldCol] === 'P'
    : true;

  const getPromotionSprite = (piece: 'Q' | 'R' | 'B' | 'N') => {
    const key = isWhitePromotion ? piece : piece.toLowerCase();
    const { x, y } = spriteMap[key as PieceKey];

    const scale = CELL_SIZE / SPRITE_SIZE;
    const sheetWidth = 6 * SPRITE_SIZE * scale;

    return {
      backgroundImage: `url(${SPRITE_SHEET})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${sheetWidth}px auto`,
      backgroundPosition: `-${x * CELL_SIZE}px -${y * CELL_SIZE}px`,
      cursor: 'pointer',
      border: '1px solid black',
      borderRadius: '4px',
      display: 'block',
    };
  };

  return (
    <>
      <StyledChessBoard aria-label='Chess Board'>
        {/* Main board with vertical rank labels */}
        {ranks.map((rank, rIndex) => {
          const row = flipBoardForBlack ? 7 - rIndex : rIndex;
          return (
            <Flex key={rank}>
              {/* Rank numbers along the left side */}
              <Box w='18px' display='flex' alignItems='center' justifyContent='center'>
                <Text fontSize='sm' color='gray.700'>
                  {rank}
                </Text>
              </Box>

              {/* Row of chess squares */}
              {files.map((file, fIndex) => {
                const col = flipBoardForBlack ? 7 - fIndex : fIndex;
                const piece = board[row]?.[col] as ChessCell;
                const isDark = (row + col) % 2 === 1;

                const borderStyles = {
                  borderRight: '1px solid black',
                  borderBottom: '1px solid black',
                  ...(rIndex === 0 && { borderTop: '1px solid black' }),
                  ...(fIndex === 0 && { borderLeft: '1px solid black' }),
                };

                const isSelected = selected?.row === row && selected?.col === col;
                const isTarget = legalTargets.some(t => t.row === row && t.col === col);

                return (
                  <StyledChessSquare
                    key={`${rank}${file}`}
                    bg={
                      isSelected
                        ? (isDark ? '#464' : '#cfc') // your existing selection colors
                        : isTarget
                        ? (isDark ? '#665500' : '#ffeb99') // highlight legal targets
                        : isDark
                        ? 'gray.600'
                        : 'white'
                    }
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
          {files.map(letter => (
            <Text key={letter} w={`${CELL_SIZE}px`} textAlign='center' fontSize='sm'>
              {letter}
            </Text>
          ))}
        </Flex>
      </StyledChessBoard>

      {/* Basic inline promotion UI (no new imports) */}
      {pendingPromotion && (
        <Flex mt={3} p={2} align='center' bg='gray.200' borderRadius='8px' gap={3}>
          <Text fontWeight='bold'>Promote pawn to:</Text>

          {promotionPieces.map(piece => (
            <Box
              key={piece}
              onClick={() => handlePromotionChoice(piece)}
              _hover={{ transform: 'scale(1.1)' }}
              transition='transform 0.1s ease'
              width={`${CELL_SIZE}px`}
              height={`${CELL_SIZE}px`}
              sx={getPromotionSprite(piece)}
            />
          ))}
        </Flex>
      )}
    </>
  );
}
