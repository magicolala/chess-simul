import { Injectable, signal } from '@angular/core';
import { Chess } from 'chess.js';

export interface FamousGame {
    id: string;
    white: string;
    black: string;
    date: string;
    event: string;
    pgn: string;
}

export interface MemoryGameState {
    currentGame: FamousGame | null;
    chess: Chess;
    targetChess: Chess;
    currentMoveIndex: number;
    lives: number;
    status: 'start' | 'memorizing' | 'playing' | 'won' | 'lost' | 'duel_intermission' | 'duel_result';
    feedbackMessage: string;
    history: string[];
    timer: number;
    mode: 'solo' | 'duel';
    duelState?: {
        p1: { score: number; lives: number; time: number; finished: boolean };
        p2: { score: number; lives: number; time: number; finished: boolean };
        currentPlayer: 1 | 2;
    };
}

@Injectable({
    providedIn: 'root'
})
export class MemoryGameService {
    private famousGames: FamousGame[] = [
        {
            id: 'immortal',
            white: 'Adolf Anderssen',
            black: 'Lionel Kieseritzky',
            date: '1851',
            event: 'London (The Immortal Game)',
            pgn: `[Event "London"]
[Site "London ENG"]
[Date "1851.06.21"]
[EventDate "1851.05.26"]
[Round "?"]
[Result "1-0"]
[White "Adolf Anderssen"]
[Black "Lionel Kieseritzky"]
[ECO "C33"]
[WhiteElo "?"]
[BlackElo "?"]
[PlyCount "45"]

1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bxb5 Nf6 6.Nf3 Qh6 7.d3 Nh5 8.Nh4 Qg5
9.Nf5 c6 10.g4 Nf6 11.Rg1 cxb5 12.h4 Qg6 13.h5 Qg5 14.Qf3 Ng8 15.Bxf4 Qf6
16.Nc3 Bc5 17.Nd5 Qxb2 18.Bd6 Bxg1 19.e5 Qxa1+ 20.Ke2 Na6 21.Nxg7+ Kd8
22.Qf6+ Nxf6 23.Be7# 1-0`
        },
        {
            id: 'opera',
            white: 'Paul Morphy',
            black: 'Duke Karl / Count Isouard',
            date: '1858',
            event: 'Paris (The Opera Game)',
            pgn: `[Event "Paris"]
[Site "Paris FRA"]
[Date "1858.10.21"]
[EventDate "?"]
[Round "?"]
[Result "1-0"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[ECO "C41"]
[WhiteElo "?"]
[BlackElo "?"]
[PlyCount "33"]

1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe4 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3
c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6
15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8# 1-0`
        },
        {
            id: 'kasparov-topalov',
            white: 'Garry Kasparov',
            black: 'Veselin Topalov',
            date: '1999',
            event: 'Wijk aan Zee (Kasparov\'s Immortal)',
            pgn: `[Event "Hoogovens A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[EventDate "1999.01.16"]
[Round "4"]
[Result "1-0"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[ECO "B07"]
[WhiteElo "2812"]
[BlackElo "2700"]
[PlyCount "87"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1
d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+
Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+
Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8
Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`
        },
        {
            id: 'fischer-byrne',
            white: 'Donald Byrne',
            black: 'Robert James Fischer',
            date: '1956',
            event: 'New York (Game of the Century)',
            pgn: `[Event "Rosenwald Memorial"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[EventDate "1956.10.07"]
[Round "8"]
[Result "0-1"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[ECO "D93"]
[WhiteElo "?"]
[BlackElo "?"]
[PlyCount "82"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4
Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6
15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1
Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3
Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8
b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+
39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`
        }
    ];

    state = signal<MemoryGameState>({
        currentGame: null,
        chess: new Chess(),
        targetChess: new Chess(),
        currentMoveIndex: 0,
        lives: 3,
        status: 'start',
        feedbackMessage: 'Bienvenue dans le mode Memory !',
        history: [],
        mode: 'solo',
        timer: 0
    });

    private timerInterval: ReturnType<typeof setInterval> | null = null;
    private autoPlayInterval: ReturnType<typeof setInterval> | null = null;

    startGame(mode: 'solo' | 'duel' = 'solo') {
        const randomIndex = Math.floor(Math.random() * this.famousGames.length);
        const selectedGame = this.famousGames[randomIndex];

        const chess = new Chess();
        const targetChess = new Chess();
        targetChess.loadPgn(selectedGame.pgn);

        const baseState: Partial<MemoryGameState> = {
            currentGame: selectedGame,
            chess: chess,
            targetChess: targetChess,
            currentMoveIndex: 0,
            lives: 3,
            status: 'memorizing',
            feedbackMessage: 'Mémorisez la séquence !',
            history: [chess.fen()],
            mode: mode,
            timer: 0
        };

        if (mode === 'duel') {
            baseState.duelState = {
                p1: { score: 0, lives: 3, time: 0, finished: false },
                p2: { score: 0, lives: 3, time: 0, finished: false },
                currentPlayer: 1
            };
        } else {
            baseState.duelState = undefined;
        }

        this.state.set(baseState as MemoryGameState);
        this.startAutoPlay();
    }

    private startAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }

        const s = this.state();
        const targetHistory = s.targetChess.history({ verbose: true });
        let playIndex = 0;

        this.autoPlayInterval = setInterval(() => {
            if (playIndex >= 20 || playIndex >= targetHistory.length) {
                this.skipMemorization();
                return;
            }

            const move = targetHistory[playIndex];
            const currentChess = new Chess(this.state().chess.fen());
            currentChess.move(move);

            this.state.update(state => ({
                ...state,
                chess: currentChess,
                currentMoveIndex: playIndex + 1,
                history: [...state.history, currentChess.fen()]
            }));

            playIndex++;
        }, 800);
    }

    skipMemorization() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }

        const chess = new Chess();

        this.state.update(state => ({
            ...state,
            chess: chess,
            currentMoveIndex: 0,
            status: 'playing',
            feedbackMessage: state.mode === 'duel'
                ? `Joueur ${state.duelState?.currentPlayer} : À vous de jouer !`
                : 'À vous ! Reproduisez les coups.',
            history: [chess.fen()]
        }));

        this.startTimer();
    }

    startDuelRound2() {
        const s = this.state();
        if (!s.duelState || !s.currentGame) {
            return;
        }

        const chess = new Chess();

        this.state.update(state => ({
            ...state,
            chess: chess,
            currentMoveIndex: 0,
            lives: 3,
            status: 'memorizing',
            feedbackMessage: 'Joueur 2 : Mémorisez la séquence !',
            history: [chess.fen()],
            timer: 0
        }));

        this.startAutoPlay();
    }

    private startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        const startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            this.state.update(s => ({ ...s, timer: elapsed }));
        }, 100);
    }

    private stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    makeMove(from: string, to: string, promotion: string = 'q'): boolean {
        const currentState = this.state();
        if (currentState.status !== 'playing') {
            return false;
        }

        const targetHistory = currentState.targetChess.history({ verbose: true });

        if (currentState.currentMoveIndex >= 20 || currentState.currentMoveIndex >= targetHistory.length) {
            this.handleWin();
            return false;
        }

        const correctMove = targetHistory[currentState.currentMoveIndex];

        try {
            const tempChess = new Chess(currentState.chess.fen());
            const attempt = tempChess.move({ from, to, promotion });

            if (!attempt) {
                return false;
            }

            if (attempt.san === correctMove.san) {
                currentState.chess.move({ from, to, promotion });
                const newIndex = currentState.currentMoveIndex + 1;

                let feedback = 'Bien joué !';
                if (currentState.mode === 'duel' && currentState.duelState) {
                    const p = currentState.duelState.currentPlayer === 1 ? 'p1' : 'p2';
                    currentState.duelState[p].score = newIndex;
                    feedback = `Joueur ${currentState.duelState.currentPlayer} : Bien joué !`;
                }

                this.state.update(s => ({
                    ...s,
                    currentMoveIndex: newIndex,
                    feedbackMessage: feedback,
                    history: [...s.history, s.chess.fen()],
                    duelState: currentState.duelState
                }));

                if (newIndex >= 20 || newIndex >= targetHistory.length) {
                    this.handleWin();
                    return true;
                }
                return true;

            } else {
                this.handleIncorrectMove();
                return false;
            }

        } catch {
            return false;
        }
    }

    private handleIncorrectMove() {
        const s = this.state();
        const newLives = s.lives - 1;

        if (s.mode === 'duel' && s.duelState) {
            const p = s.duelState.currentPlayer === 1 ? 'p1' : 'p2';
            s.duelState[p].lives = newLives;
        }

        if (newLives <= 0) {
            this.handleLoss();
        } else {
            this.state.update(state => ({
                ...state,
                lives: newLives,
                feedbackMessage: `Mauvais coup ! Il vous reste ${newLives} vie(s).`,
                duelState: s.duelState
            }));
        }
    }

    private handleWin() {
        this.stopTimer();
        this.recordDuelTime();
        const s = this.state();
        if (s.mode === 'solo') {
            this.endGame('won');
        } else {
            this.nextDuelPhase();
        }
    }

    private handleLoss() {
        this.stopTimer();
        this.recordDuelTime();
        const s = this.state();
        if (s.mode === 'solo') {
            this.endGame('lost');
        } else {
            this.nextDuelPhase();
        }
    }

    private recordDuelTime() {
        const s = this.state();
        if (s.mode === 'duel' && s.duelState) {
            const p = s.duelState.currentPlayer === 1 ? 'p1' : 'p2';
            s.duelState[p].time = s.timer;
        }
    }

    private nextDuelPhase() {
        const s = this.state();
        if (!s.duelState) {
            return;
        }

        if (s.duelState.currentPlayer === 1) {
            s.duelState.p1.finished = true;
            s.duelState.currentPlayer = 2;

            this.state.update(state => ({
                ...state,
                status: 'duel_intermission',
                feedbackMessage: "Fin du tour du Joueur 1. Passez l'appareil au Joueur 2.",
                duelState: s.duelState
            }));
        } else {
            s.duelState.p2.finished = true;
            this.endGame('duel_result');
        }
    }

    private endGame(result: 'won' | 'lost' | 'duel_result') {
        const s = this.state();
        let msg = '';

        if (result === 'won') {
            msg = 'Félicitations ! Vous avez une excellente mémoire.';
        }
        if (result === 'lost') {
            msg = 'Dommage ! Essayez encore.';
        }
        if (result === 'duel_result') {
            if (!s.duelState) {
                return;
            }
            const p1 = s.duelState.p1;
            const p2 = s.duelState.p2;

            if (p1.score > p2.score) {
                msg = "Victoire du Joueur 1 (Score) !";
            } else if (p2.score > p1.score) {
                msg = "Victoire du Joueur 2 (Score) !";
            } else {
                if (p1.time < p2.time) {
                    msg = "Égalité aux points... Joueur 1 gagne au temps !";
                } else if (p2.time < p1.time) {
                    msg = "Égalité aux points... Joueur 2 gagne au temps !";
                } else {
                    if (p1.lives > p2.lives) {
                        msg = "Égalité totale... Joueur 1 gagne aux vies !";
                    } else if (p2.lives > p1.lives) {
                        msg = "Égalité totale... Joueur 2 gagne aux vies !";
                    } else {
                        msg = "Égalité parfaite ! Incroyable.";
                    }
                }
            }
        }

        this.state.update(currentState => ({
            ...currentState,
            status: result,
            feedbackMessage: msg
        }));
    }

    reset() {
        this.stopTimer();
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
        this.startGame(this.state().mode);
    }
}
