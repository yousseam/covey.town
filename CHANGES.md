# Sprint 1

- `10/29/2025`
    - Added definition for Chess board (ChessBoard.ts)
    - Added definition for Chess piece data types (models.ts, bishop.ts, king.ts, knight.ts, pawn.ts, piece.ts, queen.ts, rook.ts)

- `10/31/2025`
    - Added Chess game area to tilemap (indoors.json)

- `11/1/2025`
    - Moved Chess game area to avoid overlap (indoors.json)

- `11/2/2025` 
    - Backend
        - Added placeholder backend gameclass to register ChessArea and bypass runtime errors to begin frontend work(ChessGameArea.ts)
        - Registered Game type Chess in GameAreaFactory.ts
        - Registered interactabletypes to include ChessArea in CoveyTownSocket.d.ts
    - Frontend
        - Added press space feature to interact with chess area
        - Added menu/board interface with chess pieces upon interaction(ChessBoard.tsx, ChessArea.tsx)
        - Integrated ChessArea into GameArea.tsx
        - Integrated ChessAreaController into TownController.ts

- `11/3/2025` 
    - Created new Chess files ChessAreaController.ts, ChessArea.tsx, ChessBoard.tsx, ChessArea.ts with  placeholder implementations
    - Modifed GamesArea.tsx, TypeUtils.ts, CoveyTownSocket.ts, and GameAreaFactory.ts to be compatible with the aforementioned new files

- `11/5/2025` 
    - Ran the linter on the codebase to fix style violations and warnings

- `11/9/2025` 
    - Created exports ChessGameState and ChessMove (CoveyTownSocket.d.ts)
    - Created ChessGame.ts for backend logic
    - Changed imports across Chess files to include Chess exports (ChessAreaController.ts, ChessArea.tsx, ChessGameArea.ts)
    - Added empty placeholder functions and if-statements to match with ConnectFour files and make later implementation easier (ChessAreaController.ts, ChessArea.tsx, ChessGameArea.ts, ChessGame.ts)

- `11/10/2025` 
    - Implemented for one player to join as White player (ChessAreaController.ts, ChessArea.tsx, ChessGameArea.ts, ChessGame.ts)
    - Changed Chess exports to more closely match the exports of the other games (CoveyTownSocket.d.ts)
    - Implemented Chess board getter method (ChessAreaController.ts)
    - Changed implementation of Chess Pieces so they don't change color based on square color (chess-sprite.png, ChessArea.tsx, ChessBoard.tsx)
    - Added preliminary implementation for moving a piece on the Chess Board (ChessBoard.tsx)
    - Updated Chess files to be compatible with revamped board (ChessAreaController.ts, ChessArea.tsx, ChessGame.ts, ChessGameArea.ts)

- `11/11/2025` 
    - Implemented for second player to join as Black player (ChessAreaController.ts, ChessArea.tsx, ChessGame.ts)
    - Implemented for either player to leave the game, causing the player's ID to be removed from the game state (ChessGame.ts, ChessGameArea.ts)

- `11/14/2025`
    - Implemented Chess Game States WAITING_FOR_PLAYERS, WAITING_TO_START, IN_PROGRESS, and OVER (ChessAreaController.ts, ChessArea.tsx, ChessGame.ts, ChessGameArea.ts)
    - Modified the Chess board so that the cells can toggle to be deselectable (ChessBoard.tsx)

- `11/15/2025`
    - Added Test Suite for ChessArea.tsx(ChessArea.test.tsx)
    - Added Test Suite for ChessBoard.tsx(ChessBoard.test.tsx)
    - Added Test Suite for ChessAreaController.ts(ChessAreaController.test.ts)
    - Testing for Game States are reliant on the completion of the backend, when
       win/lose/draw/leave/join conditions are fully implemented

- `11/16/2025` 
    - Implemented Chess rule checking using chess.ts (ChessGame.ts)
    - Adjusted startGame() to work with chess.ts (ChessGame.ts)
    - Implemented applyMove(), _applyMove(), _validateMove(), and _checkForGameEnding() (ChessGame.ts)
    - Wrote tests for the newly implemented functions (ChessGame.test.ts)

- `11/18/2025` 
    - Updated ChessGame.ts to accommodate pawn promotions
    - Updated ChessGameArea.ts to handle 'GameMove' interactable commands
    - Implemented Rule checking through the backend in ChessAreaController.ts and finalized all the necessary handlers
    - Updated both ChessArea.tsx and ChessBoard.tsx to accommodate the changes
    - Implemented functionality to make the chess board flip upside down if the player is black or is able to join as black

- `11/20/2025` 
    - Modified ChessBoard.tsx to remove the rounding on the corners of the Chess board cells

- `11/25/2025` 
    - Modified ChessBoard.tsx to be 75% opaque when selecting a cell is disabled

- `11/28/2025`
    - Created ChessGameArea.test.ts file which implements test suite for
    ChessGameArea.ts, tests player commands regarding game states
    - Expanded upon ChessGame.test.ts file to implement testing for basic and final working game states, rule checking and alternating turns tests are included