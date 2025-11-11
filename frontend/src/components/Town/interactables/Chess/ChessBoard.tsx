import React, { useMemo, useState } from 'react';
import { Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react';

/**
 * ChessBoardInteractive.tsx
 *
 * Minimal piece movement with NO rule checking.
 * - Click a square with a piece to select it.
 * - Click any destination square to move there (captures overwrite).
 * - Click the selected square again (or the Reset button) to cancel/clear.
 * - Ranks (1–8) and files (A–H) labels included; white is at the bottom.
 */

export type Square = { row: number; column: number };

export default function ChessBoardInteractive(): JSX.Element {
  const files = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], []);
  const ranks = useMemo(() => [8, 7, 6, 5, 4, 3, 2, 1], []);

  const initialBoard: string[][] = useMemo(
    () => [
      ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
      ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
      ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
    ],
    []
  );

  const [board, setBoard] = useState<string[][]>(initialBoard.map((r) => r.slice()));
  const [selected, setSelected] = useState<Square | null>(null);

  const resetBoard = () => {
    const fresh = initialBoard.map((row) => row.slice());
    setBoard(fresh);
    setSelected(null);
  };

  const onSquareClick = (row: number, column: number) => {
    const piece = board[row][column];

    // No selection yet: select the piece if present
    if (!selected) {
      if (piece) setSelected({ row, column });
      return;
    }

    // If clicking the same square, unselect
    if (selected.row === row && selected.column === column) {
      setSelected(null);
      return;
    }

    // Directly apply move (no backend validation)
    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[selected.row][selected.column] = '';
      next[row][column] = prev[selected.row][selected.column];
      return next;
    });

    setSelected(null);
  };

  return (
    <VStack spacing={3} align="start">
      <HStack>
        <Button size="sm" onClick={resetBoard}>Reset</Button>
        <Text fontSize="sm" color="gray.600">
          Tip: click a piece, then any destination square.
        </Text>
      </HStack>

      {/* Board */}
      <VStack spacing={0}>
        {ranks.map((rank, rowIndex) => (
          <HStack key={rank} spacing={0}>
            {/* Rank label on the left */}
            <Box w="20px" textAlign="center">
              <Text fontSize="sm" color="gray.700">{rank}</Text>
            </Box>

            {/* Row of squares */}
            {files.map((file, columnIndex) => {
              const isDark = (rowIndex + columnIndex) % 2 === 1;
              const pieceHere = board[rowIndex][columnIndex];
              const isSelected = selected && selected.row === rowIndex && selected.column === columnIndex;
              const isWhitePiece = '♙♖♘♗♕♔'.includes(pieceHere);

              return (
                <Box
                  key={`${rank}${file}`}
                  onClick={() => onSquareClick(rowIndex, columnIndex)}
                  bg={isSelected ? 'yellow.300' : isDark ? 'gray.600' : 'white'}
                  color={isWhitePiece ? 'white' : 'black'}
                  textShadow={isWhitePiece ? '0 0 1px #000, 0 0 2px #000' : undefined}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="2xl"
                  fontFamily="Segoe UI Symbol, Noto Sans Symbols, Arial Unicode MS"
                  w="50px"
                  h="50px"
                  border="1px solid black"
                  userSelect="none"
                  cursor={pieceHere || selected ? 'pointer' : 'default'}
                  _hover={{ outline: '2px solid', outlineColor: 'blue.300' }}
                >
                  {pieceHere}
                </Box>
              );
            })}
          </HStack>
        ))}

        {/* File labels */}
        <Flex justify="center" mt={1} ml="20px">
          {files.map((letter) => (
            <Text key={letter} w="50px" textAlign="center" fontSize="sm">
              {letter}
            </Text>
          ))}
        </Flex>
      </VStack>
    </VStack>
  );
}