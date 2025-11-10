import Player from '../../lib/Player';
import {
    ChessGameState,
    ChessMove,
    GameMove,
    PlayerID,
} from '../../types/CoveyTownSocket';
import { Color, Coords, FENChar } from './chess-game-logic/models';
import Game from './Game';

/**
 * A ChessGame is a Game that implements the rules of Chess.
 */

export default class ChessGame extends Game<ChessGameState, ChessMove> {

    public constructor(priorGame?: ChessGame) {
        super({
            moves: [],
            status: 'WAITING_FOR_PLAYERS',
            firstPlayer: 'White',
        });
    }

    protected _join(player: Player): void {
        // TODO: implement this
    }
    
    public startGame(player: Player): void {
        // TODO: implement this
    }

    public applyMove(move: GameMove<ChessMove>): void {
        // TODO: implement this
    }

    protected _applyMove(move: ChessMove): void {
        // TODO: implement this
        // Use Stockfish?
    }

    protected _validateMove(move: ChessMove): void {
        // TODO: implement this
        // Use Stockfish?
    }

    private _checkForGameEnding() {
        // TODO: implement this
    }

    protected _leave(player: Player): void {
        // TODO: implement this
    }
}