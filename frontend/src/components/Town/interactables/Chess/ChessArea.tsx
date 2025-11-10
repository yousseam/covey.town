import { Button, Flex, Box, Text, VStack, useToast } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import ChessAreaController from '../../../../classes/interactable/ChessAreaController';
import PlayerController from '../../../../classes/PlayerController';
import { useInteractableAreaController } from '../../../../classes/TownController';
import useTownController from '../../../../hooks/useTownController';
import { GameStatus, InteractableID } from '../../../../types/CoveyTownSocket';
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
  const gameAreaController = useInteractableAreaController<ChessAreaController>(interactableID);
  const townController = useTownController();

  const [blackPlayer, setBlackPlayer] = useState<string | undefined>();
  const [whitePlayer, setWhitePlayer] = useState<string | undefined>();
  const [joiningGame, setJoiningGame] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const updateGameState = () => {
      // TODO: implement this
    }
    const onGameEnd = () => {
      // TODO: implement this
    }
    gameAreaController.addListener('gameUpdated', updateGameState);
    gameAreaController.addListener('gameEnd', onGameEnd);
    return () => {
      gameAreaController.removeListener('gameUpdated', updateGameState);
      gameAreaController.removeListener('gameEnd', onGameEnd);
    };

  }, [townController, gameAreaController, toast]);

  const handleJoinTwoPlayer = async () => {
    setGameStarted(true);
    setWhitePlayer('Player 1'); // Placeholder for now    

    // TODO: implement this
  };

  const handleJoinBot = () => {
    setGameStarted(true);
    setBlackPlayer('Bot'); // Placeholder for future AI integration

    // TODO: implement this
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
          <Button size='sm' colorScheme='gray' onClick={handleJoinBot} 
            isLoading={joiningGame}
            disabled={joiningGame}>
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
