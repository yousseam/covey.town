import React from 'react';
import { Box, SimpleGrid, Text, Flex, HStack, VStack } from '@chakra-ui/react';

/**
 * ChessBoard.tsx
 *
 * Renders an 8x8 static chessboard with Unicode piece placeholders.
 * Includes rank (1–8) and file (A–H) labels.
 * White is at the bottom. No game logic yet — purely visual.
 */

export default function ChessBoard(): JSX.Element {
  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  // Unicode-based initial layout (top = black, bottom = white)
  const initialBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟︎', '♟︎', '♟︎', '♟︎', '♟︎', '♟︎', '♟︎', '♟︎'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
  ];

  return (
    <VStack spacing={1}>
      {/* Main board with vertical rank labels */}
      {ranks.map((rank, rIndex) => (
        <HStack key={rank} spacing={0}>
          {/* Rank numbers along the left side */}
          <Box w='20px' textAlign='center'>
            <Text fontSize='sm' color='gray.700'>
              {rank}
            </Text>
          </Box>

          {/* Row of chess squares */}
          {files.map((file, fIndex) => {
            const piece = initialBoard[rIndex][fIndex];
            const isDark = (rIndex + fIndex) % 2 === 1;
            return (
              <Box
                key={`${rank}${file}`}
                bg={isDark ? 'gray.600' : 'white'}
                color={isDark ? 'white' : 'black'}
                display='flex'
                alignItems='center'
                justifyContent='center'
                fontSize='2xl'
                fontFamily='Segoe UI Symbol, Noto Sans Symbols, Arial Unicode MS'
                w='50px'
                h='50px'
                border='1px solid black'
                userSelect='none'>
                {piece}
              </Box>
            );
          })}
        </HStack>
      ))}

      {/* File (A–H) labels below the board */}
      <Flex justify='center' mt={1} ml='20px'>
        {files.map(letter => (
          <Text key={letter} w='50px' textAlign='center' fontSize='sm'>
            {letter}
          </Text>
        ))}
      </Flex>
    </VStack>
  );
}
