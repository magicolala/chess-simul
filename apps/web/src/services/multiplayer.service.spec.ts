import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiplayerService, type MultiplayerRoom } from './multiplayer.service';
import type { GameConfig } from './chess-logic.service';

describe('MultiplayerService', () => {
    let service: MultiplayerService;

    beforeEach(() => {
        vi.useFakeTimers();

        TestBed.configureTestingModule({
            providers: [MultiplayerService]
        });

        service = TestBed.inject(MultiplayerService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('should initialize with mock rooms', () => {
            const rooms = service.rooms();
            expect(rooms.length).toBeGreaterThan(0);
            expect(rooms.every((r) => r.status === 'waiting')).toBe(true);
        });

        it('should initialize with no current room', () => {
            expect(service.currentRoom()).toBeNull();
        });

        it('should start latency simulation', () => {
            const initialLatency = service.latency();
            vi.advanceTimersByTime(2000);
            const newLatency = service.latency();

            // Latency should have changed
            expect(newLatency).not.toBe(initialLatency);
        });
    });

    describe('Room Creation', () => {
        const config: GameConfig = {
            timeMinutes: 10,
            incrementSeconds: 5,
            opponentCount: 1,
            difficulty: 'pvp'
        };

        it('should create a public room', () => {
            const roomId = service.createRoom(config, false, 'TestHost', 'avatar.png', 1500);

            expect(roomId).toBeDefined();
            expect(roomId.length).toBeGreaterThan(0);

            const currentRoom = service.currentRoom();
            expect(currentRoom).not.toBeNull();
            expect(currentRoom?.hostName).toBe('TestHost');
            expect(currentRoom?.isPrivate).toBe(false);
            expect(currentRoom?.status).toBe('waiting');

            // Should be added to public rooms list
            const publicRooms = service.rooms();
            expect(publicRooms.some((r) => r.id === roomId)).toBe(true);
        });

        it('should create a private room', () => {
            const initialRoomCount = service.rooms().length;
            const roomId = service.createRoom(config, true, 'PrivateHost', 'avatar.png', 1600);

            expect(service.currentRoom()?.isPrivate).toBe(true);

            // Should NOT be added to public rooms list
            expect(service.rooms().length).toBe(initialRoomCount);
        });

        it('should initialize room with host player', () => {
            const roomId = service.createRoom(config, false, 'Host', 'avatar.png', 1400);

            const room = service.currentRoom();
            expect(room?.players).toHaveLength(1);
            expect(room?.players[0].name).toBe('Host');
            expect(room?.players[0].id).toBe('host');
            expect(room?.players[0].isReady).toBe(false);
        });
    });

    describe('Joining Rooms', () => {
        let roomId: string;

        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            roomId = service.createRoom(config, false, 'Host', 'host-avatar.png', 1500);
        });

        it('should join an existing room', () => {
            service.joinRoom(roomId, 'Guest', 'guest-avatar.png');

            const room = service.currentRoom();
            expect(room?.players).toHaveLength(2);
            expect(room?.players[1].name).toBe('Guest');
            expect(room?.status).toBe('full');
        });

        it('should assign opposite color to guest', () => {
            const hostSide = service.currentRoom()?.players[0].side;

            service.joinRoom(roomId, 'Guest', 'guest-avatar.png');

            const guestSide = service.currentRoom()?.players[1].side;
            expect(guestSide).not.toBe(hostSide);
        });

        it('should throw error for non-existent room', () => {
            expect(() => service.joinRoom('invalid-id', 'Guest', 'avatar.png')).toThrow(
                'Salon introuvable'
            );
        });

        it('should throw error when room is not waiting', () => {
            service.joinRoom(roomId, 'Guest', 'guest-avatar.png');

            // Room is now full, try to join again
            expect(() => service.joinRoom(roomId, 'Guest2', 'avatar.png')).toThrow(
                'Le salon est complet ou la partie a commencé'
            );
        });
    });

    describe('Ready State Management', () => {
        let roomId: string;

        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            roomId = service.createRoom(config, false, 'Host', 'host-avatar.png', 1500);
            service.joinRoom(roomId, 'Guest', 'guest-avatar.png');
        });

        it('should toggle ready state', () => {
            const initialReady = service.currentRoom()?.players[1].isReady;

            service.toggleReady();

            const newReady = service.currentRoom()?.players[1].isReady;
            expect(newReady).toBe(!initialReady);
        });

        it('should start game when both players are ready', () => {
            // Set both players ready
            const room = service.currentRoom();
            if (room) {
                room.players[0].isReady = true;
                room.players[1].isReady = false;
                service.currentRoom.set(room);
            }

            service.toggleReady();

            expect(service.currentRoom()?.status).toBe('playing');
        });
    });

    describe('Leaving Rooms', () => {
        it('should clear current room', () => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            const roomId = service.createRoom(config, false, 'Host', 'avatar.png', 1500);

            expect(service.currentRoom()).not.toBeNull();

            service.leaveRoom();

            expect(service.currentRoom()).toBeNull();
        });

        it('should remove public room from list', () => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            const roomId = service.createRoom(config, false, 'Host', 'avatar.png', 1500);

            const initialCount = service.rooms().length;

            service.leaveRoom();

            expect(service.rooms().length).toBe(initialCount - 1);
            expect(service.rooms().some((r) => r.id === roomId)).toBe(false);
        });
    });

    describe('Chat Messaging', () => {
        beforeEach(() => {
            const config: GameConfig = {
                timeMinutes: 5,
                incrementSeconds: 0,
                opponentCount: 1,
                difficulty: 'pvp'
            };
            service.createRoom(config, false, 'Host', 'avatar.png', 1500);
        });

        it('should send message to current room', () => {
            service.sendMessage('Hello!', 'Host');

            const room = service.currentRoom();
            expect(room?.messages).toHaveLength(1);
            expect(room?.messages[0]).toEqual({ sender: 'Host', text: 'Hello!' });
        });

        it('should append messages in order', () => {
            service.sendMessage('First message', 'Host');
            service.sendMessage('Second message', 'Guest');

            const room = service.currentRoom();
            expect(room?.messages).toHaveLength(2);
            expect(room?.messages[0].text).toBe('First message');
            expect(room?.messages[1].text).toBe('Second message');
        });

        it('should do nothing when no current room', () => {
            service.leaveRoom();

            expect(() => service.sendMessage('Test', 'User')).not.toThrow();
        });
    });

    describe('Matchmaking', () => {
        const originalRandom = Math.random;

        beforeEach(() => {
            // Ensure successful matchmaking by default (value < 0.9)
            Math.random = () => 0.5;
        });

        afterEach(() => {
            Math.random = originalRandom;
        });

        it('should find opponent successfully', async () => {
            const promise = service.startMatchmaking({ mode: 'blitz' });

            expect(service.isMatchmaking()).toBe(true);

            vi.advanceTimersByTime(3000);
            await promise;

            expect(service.isMatchmaking()).toBe(false);
            expect(service.currentRoom()).not.toBeNull();
            expect(service.currentRoom()?.status).toBe('playing');
        });

        it('should handle matchmaking timeout', async () => {
            // Force timeout (value > 0.9)
            Math.random = () => 0.95;

            const promise = service.startMatchmaking({ mode: 'bullet' });

            vi.advanceTimersByTime(3000);

            await expect(promise).rejects.toThrow('Aucun adversaire trouvé');
            expect(service.isMatchmaking()).toBe(false);
        });

        it('should use correct time controls for mode', async () => {
            const promise = service.startMatchmaking({ mode: 'rapid' });

            vi.advanceTimersByTime(3000);
            await promise;

            const room = service.currentRoom();
            expect(room?.config.timeMinutes).toBe(10);
            expect(room?.config.incrementSeconds).toBe(5);
        });
    });

    describe('Connection Status', () => {
        it('should report excellent connection for low latency', () => {
            service.latency.set(50);
            expect(service.connectionStatus()).toBe('excellent');
        });

        it('should report good connection for medium latency', () => {
            service.latency.set(150);
            expect(service.connectionStatus()).toBe('good');
        });

        it('should report poor connection for high latency', () => {
            service.latency.set(350);
            expect(service.connectionStatus()).toBe('poor');
        });

        it('should report offline for negative latency', () => {
            service.latency.set(-1);
            expect(service.connectionStatus()).toBe('offline');
        });
    });
});
