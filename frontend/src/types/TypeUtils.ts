import {
  ConversationArea,
  Interactable,
  TicTacToeGameState,
  ViewingArea,
  GameArea,
  ConnectFourGameState,
} from './CoveyTownSocket';

/**
 * Test to see if an interactable is a conversation area
 */
export function isConversationArea(interactable: Interactable): interactable is ConversationArea {
  return interactable.type === 'ConversationArea';
}

/**
 * Test to see if an interactable is a viewing area
 */
export function isViewingArea(interactable: Interactable): interactable is ViewingArea {
  return interactable.type === 'ViewingArea';
}

export function isTicTacToeArea(
  interactable: Interactable,
): interactable is GameArea<TicTacToeGameState> {
  return interactable.type === 'TicTacToeArea';
}
export function isConnectFourArea(
  interactable: Interactable,
): interactable is GameArea<ConnectFourGameState> {
  return interactable.type === 'ConnectFourArea';
}

export function isChessArea(interactable: Interactable): interactable is GameArea<any> {
  return interactable.type === 'ChessArea';
}
/* This function is a typeguard for the chess game area, it allows
   the frontend to determine if an interactable object is a chess
   game area 
*/
