import { Button, Flex, Box, Text, VStack, useToast } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import ChessAreaController from '../../../../classes/interactable/ChessAreaController';
import PlayerController from '../../../../classes/PlayerController';
import { useInteractableAreaController } from '../../../../classes/TownController';
import useTownController from '../../../../hooks/useTownController';
import { GameStatus, InteractableID, ChessColor } from '../../../../types/CoveyTownSocket';
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
 */

export default function ChessArea({
  interactableID,
}: {
  interactableID: InteractableID;
}): JSX.Element {
  const gameAreaController = useInteractableAreaController<ChessAreaController>(interactableID);
  const townController = useTownController();
  const toast = useToast();

  const [blackPlayer, setBlackPlayer] = useState<PlayerController | undefined>(
    gameAreaController.black,
  );
  const [whitePlayer, setWhitePlayer] = useState<PlayerController | undefined>(
    gameAreaController.white,
  );
  const [joiningGame, setJoiningGame] = useState(false);
  const [botMenuOpen, setBotMenuOpen] = useState(false);
  const [twoPlayerSelected, setTwoPlayerSelected] = useState(false);
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [gameStatus, setGameStatus] = useState<GameStatus>(gameAreaController.status);
  const [moveCount, setMoveCount] = useState<number>(gameAreaController.moveCount);
  const [isOurTurn, setIsOurTurn] = useState<boolean>(gameAreaController.isOurTurn);

  useEffect(() => {
    const updateGameState = () => {
      setBlackPlayer(gameAreaController.black);
      setWhitePlayer(gameAreaController.white);
      setGameStatus(gameAreaController.status || 'WAITING_TO_START');
      setMoveCount(gameAreaController.moveCount || 0);
      setIsOurTurn(gameAreaController.isOurTurn);
    };

    const onGameEnd = () => {
      const winner = gameAreaController.winner;
      if (winner) {
        toast({
          title: 'Game over',
          description:
            winner.id === townController.ourPlayer.id
              ? 'You won the game!'
              : `${winner.userName} won the game.`,
          status: 'info',
        });
      } else {
        toast({
          title: 'Game over',
          description: 'The game ended in a draw.',
          status: 'info',
        });
      }
    };

    gameAreaController.addListener('gameUpdated', updateGameState);
    gameAreaController.addListener('gameEnd', onGameEnd);

    // Initialize once in case we mounted mid-game
    updateGameState();

    return () => {
      gameAreaController.removeListener('gameUpdated', updateGameState);
      gameAreaController.removeListener('gameEnd', onGameEnd);
    };
  }, [townController, gameAreaController, toast]);

  /**
   * Called when the player clicks the "Join 2-player Game" button
   */
  const handleJoinTwoPlayer = async () => {
    setJoiningGame(true);
    setTwoPlayerSelected(true);
    try {
      await gameAreaController.joinGame();
    } catch (err) {
      toast({
        title: 'Error joining game',
        description: (err as Error).toString(),
        status: 'error',
      });
    }
    setJoiningGame(false);
  };

  /**
   * Called when the player clicks the "Start Game" button
   */
  const handleStartGame = async () => {
    setJoiningGame(true);
    setTwoPlayerSelected(true);
    try {
      await gameAreaController.startGame();
    } catch (err) {
      toast({
        title: 'Error starting game',
        description: (err as Error).toString(),
        status: 'error',
      });
    }
    setJoiningGame(false);
  };

  /**
   * Called when the player clicks the "Join Game with Bot" button
   */
  const handleJoinBot = async (
    color: ChessColor,
    difficulty: 'easy' | 'medium' | 'hard'
  ) => {
    setJoiningGame(true);
    try {
      await gameAreaController.joinBotGame(color, difficulty);
    } catch (err) {
      toast({
        title: 'Error joining bot game',
        description: (err as Error).toString(),
        status: 'error',
      });
    }
    setJoiningGame(false);
  };

  let vsButton = <></>;
  if (gameStatus === 'IN_PROGRESS') {
    vsButton = <></>;
  } else if (gameStatus === 'WAITING_TO_START') {
    vsButton = (
      <Button
        size='sm'
        colorScheme='gray'
        onClick={handleStartGame}
        isLoading={joiningGame}
        disabled={joiningGame}>
        Start Game (PvP)
      </Button>
    );
  } else {
    vsButton = (
      <Button
        size='sm'
        colorScheme='gray'
        onClick={handleJoinTwoPlayer}
        isLoading={joiningGame}
        disabled={joiningGame}>
        Join 2-player Game
      </Button>
    );
  }

  let botButton = <></>;
  if (gameStatus !== 'IN_PROGRESS') {
    // Stage 1: initial button
  if (!difficultyMenuOpen && !botMenuOpen) {
    botButton = (
      <Button
        size='sm'
        colorScheme='gray'
        onClick={() => setDifficultyMenuOpen(true)}
        disabled={joiningGame}
      >
        Join Game with Bot
      </Button>
    );
  }

  // Stage 2: choose difficulty
  else if (difficultyMenuOpen) {
    botButton = (
      <VStack spacing={1}>
        <Text>Select Difficulty:</Text>
        <Button size="sm" onClick={() => { setDifficulty('easy'); setDifficultyMenuOpen(false); setBotMenuOpen(true); }}>
          Easy
        </Button>
        <Button size="sm" onClick={() => { setDifficulty('medium'); setDifficultyMenuOpen(false); setBotMenuOpen(true); }}>
          Medium
        </Button>
        <Button size="sm" onClick={() => { setDifficulty('hard'); setDifficultyMenuOpen(false); setBotMenuOpen(true); }}>
          Hard
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDifficultyMenuOpen(false)}>
          Cancel
        </Button>
      </VStack>
    );
  }

  // Stage 3: choose color
  else if (botMenuOpen) {
    botButton = (
      <VStack spacing={1}>
        <Text>Select Side:</Text>
        <Button
          size='sm'
          colorScheme='gray'
          onClick={() => handleJoinBot('White', difficulty)}
          disabled={joiningGame}
        >
          Play as White
        </Button>
        <Button
          size='sm'
          colorScheme='gray'
          onClick={() => handleJoinBot('Black', difficulty)}
          disabled={joiningGame}
        >
          Play as Black
        </Button>
        <Button
          size='sm'
          variant='ghost'
          onClick={() => setBotMenuOpen(false)}
        >
          Cancel
        </Button>
      </VStack>
    );
  }
  }

  return (
    <VStack spacing={4} align='start'>
      <Text fontWeight='bold'>
        {gameStatus === 'IN_PROGRESS'
          ? isOurTurn
            ? 'Your turn.'
            : 'Waiting for opponent.'
          : 'Game not yet started.'}
      </Text>

      <Flex justify='space-between' w='100%'>
        <VStack align='start'>
          <Text>White: {gameStatus === 'IN_PROGRESS' ? (whitePlayer?.userName ? whitePlayer.userName : (difficulty === null ? '(No player yet!)' : `Bot (${difficulty})`)) : (whitePlayer?.userName || '(No player yet!)')}</Text>
          <Text>Black: {gameStatus === 'IN_PROGRESS' ? (blackPlayer?.userName ? blackPlayer.userName : (difficulty === null ? '(No player yet!)' : `Bot (${difficulty})`)) : (blackPlayer?.userName || '(No player yet!)')}</Text>
          <Text>Moves played: {moveCount}</Text>
        </VStack>

        <VStack spacing={2} align='end'>
          {!botMenuOpen && !difficultyMenuOpen && vsButton}

          {!twoPlayerSelected && botButton}
        </VStack>
      </Flex>

      <Box>
        <ChessBoard gameAreaController={gameAreaController} />
      </Box>
    </VStack>
  );
}
