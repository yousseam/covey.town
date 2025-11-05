import { Button, Flex, Box, Text, VStack } from '@chakra-ui/react';
import React, { useState } from 'react';
import { InteractableID } from '../../../../types/CoveyTownSocket';
import ChessBoard from './ChessBoard';

/**
 * ChessArea.tsx
 *
 * Handles the Chess game modal UI that appears when the player interacts
 * with the chess area in the game world.
 *
 * Displays:
 *  - Game status text (not started / in progress)
 *  - Player slots for Black and White
 *  - Two join buttons (2-player, vs bot)
 *  - The static chessboard (rendered by ChessBoard.tsx)
 *
 * All logic here is frontend-only (no backend integration yet).
 */

export default function ChessArea({
  interactableID,
}: {
  interactableID: InteractableID;
}): JSX.Element {
  const [blackPlayer, setBlackPlayer] = useState<string | undefined>();
  const [whitePlayer, setWhitePlayer] = useState<string | undefined>();
  const [gameStarted, setGameStarted] = useState(false);

  const handleJoinTwoPlayer = () => {
    setGameStarted(true);
    setWhitePlayer('Player 1'); // Placeholder for now
  };

  const handleJoinBot = () => {
    setGameStarted(true);
    setBlackPlayer('Bot'); // Placeholder for future AI integration
  };

  return (
    <VStack spacing={4} align='start'>
      <Text fontWeight='bold'>{gameStarted ? 'Game in progress.' : 'Game not yet started.'}</Text>

      <Flex justify='space-between' w='100%'>
        <VStack align='start'>
          <Text>White: {whitePlayer || '(No player yet!)'}</Text>
          <Text>Black: {blackPlayer || '(No player yet!)'}</Text>
        </VStack>

        <VStack spacing={2} align='end'>
          <Button size='sm' colorScheme='gray' onClick={handleJoinTwoPlayer}>
            Join 2-player Game
          </Button>
          <Button size='sm' colorScheme='gray' onClick={handleJoinBot}>
            Join Game with Bot
          </Button>
        </VStack>
      </Flex>

      <Box>
        <ChessBoard />
      </Box>
    </VStack>
  );
}
