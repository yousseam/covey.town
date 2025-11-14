# Sprint 1

- `10/31/2025` Added Chess game area to tilemap

- `11/2/2025` 
    - Backend
        - Added placeholder backend gameclass to register ChessArea and bypass runtime errors to begin frontend work(ChessGameArea.ts)
        - Registered Game type Chess in GameAreaFactory.ts
        - Registered interactabletypes to include ChessArea in CoveyTownSocket.d.ts
    - Frontend
        - Added press space feature to interact with chess area
        - Added menu/board interface upon interaction(ChessBoard.tsx, ChessArea.tsx)
        - Integrated ChessArea into GameArea.tsx
        - Integrated ChessAreaController into TownController.ts

- `11/12/2025`
    - Added Test Suite for ChessArea.tsx(ChessArea.test.tsx)
    - Added Test Suite for ChessBoard.tsx(ChessBoard.test.tsx)
    - Added Test Suite for ChessAreaController.ts(ChessAreaController.test.ts)
    - Testing for Game States are reliant on the completion of the backend, when
       win/lose/draw/leave/join conditions are fully implemented