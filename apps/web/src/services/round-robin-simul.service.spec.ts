import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoundRobinSimulService } from './round-robin-simul.service';
import type {
    RoundRobinSessionResponse,
    RoundRobinJoinResponse,
    RoundRobinStartResponse,
    RoundRobinGameSummary
} from '@chess-simul/shared';

const createMockSession = (overrides: any = {}) => ({
    id: 'session-123',
    hostId: 'user-1',
    status: 'draft',
    inviteCode: 'ABC123',
    participants: [],
    createdAt: new Date().toISOString(),
    ...overrides
});

const createMockGame = (overrides: any = {}): RoundRobinGameSummary => ({
    id: 'game-1',
    gameId: 'game-1',
    sessionId: 'session-123',
    whiteId: 'user-1',
    blackId: 'user-2',
    whiteName: 'Player 1',
    blackName: 'Player 2',
    status: 'pending',
    result: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ...overrides
});

describe('RoundRobinSimulService', () => {
    let service: RoundRobinSimulService;
    let supabaseMock: any;
    let fetchMock: any;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock;

        supabaseMock = {
            client: {
                auth: {
                    getSession: vi.fn(async () => ({
                        data: { session: { access_token: 'mock-token' } },
                        error: null
                    }))
                }
            }
        };

        service = new RoundRobinSimulService(supabaseMock as any);
    });

    describe('Session Creation', () => {
        it('should create a new session successfully', async () => {
            const mockResponse: RoundRobinSessionResponse = {
                session: createMockSession(),
                inviteLink: 'https://example.com/invite/ABC123'
            };

            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const session = await service.createSession();

            expect(session).toBeDefined();
            expect(session?.id).toBe('session-123');
            expect(service.session()).toEqual(mockResponse.session);
            expect(service.inviteLink()).toBe(mockResponse.inviteLink);
            expect(service.loading()).toBe(false);
            expect(service.error()).toBeNull();
        });

        it('should handle creation errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                text: async () => JSON.stringify({ error: 'Creation failed' })
            });

            const session = await service.createSession();

            expect(session).toBeNull();
            expect(service.error()).toBe('Creation failed');
            expect(service.session()).toBeNull();
        });

        it('should set loading state during creation', async () => {
            fetchMock.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    ok: true,
                                    text: async () => JSON.stringify({ session: createMockSession() })
                                }),
                            100
                        )
                    )
            );

            const promise = service.createSession();
            expect(service.loading()).toBe(true);

            await promise;
            expect(service.loading()).toBe(false);
        });
    });

    describe('Fetching Sessions', () => {
        it('should fetch session by ID', async () => {
            const mockResponse: RoundRobinJoinResponse = {
                session: createMockSession({ id: 'session-456' })
            };

            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const session = await service.fetchSession('session-456');

            expect(session).toBeDefined();
            expect(session?.id).toBe('session-456');
            expect(service.session()).toEqual(mockResponse.session);
        });

        it('should fetch session by invite code', async () => {
            const mockResponse: RoundRobinJoinResponse = {
                session: createMockSession({ inviteCode: 'XYZ789' })
            };

            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const session = await service.fetchSessionByInvite('XYZ789');

            expect(session).toBeDefined();
            expect(session?.inviteCode).toBe('XYZ789');
        });

        it('should handle fetch errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                text: async () => JSON.stringify({ error: 'Session not found' })
            });

            const session = await service.fetchSession('invalid-id');

            expect(session).toBeNull();
            expect(service.error()).toBe('Session not found');
            expect(service.session()).toBeNull();
        });
    });

    describe('Joining Sessions', () => {
        it('should join session with invite code', async () => {
            const mockResponse: RoundRobinJoinResponse = {
                session: createMockSession({
                    participants: [{ id: 'user-1', name: 'Player 1' }]
                })
            };

            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const session = await service.joinSession('session-123', 'ABC123');

            expect(session).toBeDefined();
            expect(session?.participants).toHaveLength(1);
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/session-123/join'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ invite_code: 'ABC123' })
                })
            );
        });

        it('should handle join errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                text: async () => JSON.stringify({ error: 'Invalid invite code' })
            });

            const session = await service.joinSession('session-123', 'WRONG');

            expect(session).toBeNull();
            expect(service.error()).toBe('Invalid invite code');
        });
    });

    describe('Starting Sessions', () => {
        it('should start session and fetch games', async () => {
            const mockStartResponse: RoundRobinStartResponse = {
                success: true,
                gamesCreated: 3
            };

            const mockSession = createMockSession({ status: 'started' });
            const mockGames = [createMockGame(), createMockGame({ id: 'game-2' })];

            fetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify(mockStartResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ session: mockSession })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => JSON.stringify({ games: mockGames })
                });

            const result = await service.startSession('session-123');

            expect(result).toBeDefined();
            expect(result?.success).toBe(true);
            expect(service.session()?.status).toBe('started');
            expect(service.games()).toHaveLength(2);
        });

        it('should handle start errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                text: async () => JSON.stringify({ error: 'Not enough participants' })
            });

            const result = await service.startSession('session-123');

            expect(result).toBeNull();
            expect(service.error()).toBe('Not enough participants');
        });
    });

    describe('Fetching Games', () => {
        it('should fetch games for session', async () => {
            const mockGames = [
                createMockGame(),
                createMockGame({ id: 'game-2', status: 'active' }),
                createMockGame({ id: 'game-3', status: 'completed' })
            ];

            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify({ games: mockGames })
            });

            const games = await service.fetchGames('session-123');

            expect(games).toHaveLength(3);
            expect(service.games()).toEqual(mockGames);
        });

        it('should handle empty games list', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify({ games: [] })
            });

            const games = await service.fetchGames('session-123');

            expect(games).toEqual([]);
            expect(service.games()).toEqual([]);
        });
    });

    describe('Deleting Sessions', () => {
        beforeEach(() => {
            service.session.set(createMockSession());
            service.games.set([createMockGame()]);
            service.inviteLink.set('https://example.com/invite/ABC123');
        });

        it('should delete session and clear state', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify({ success: true })
            });

            const result = await service.deleteSession('session-123');

            expect(result).toBe(true);
            expect(service.session()).toBeNull();
            expect(service.games()).toEqual([]);
            expect(service.inviteLink()).toBeNull();
        });

        it('should handle delete errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                text: async () => JSON.stringify({ error: 'Permission denied' })
            });

            const result = await service.deleteSession('session-123');

            expect(result).toBe(false);
            expect(service.error()).toBe('Permission denied');
        });
    });

    describe('Authentication', () => {
        it('should throw error when not authenticated', async () => {
            supabaseMock.client.auth.getSession.mockResolvedValue({
                data: { session: null },
                error: null
            });

            await expect(service.createSession()).rejects.toThrow('Connexion requise');
        });

        it('should include auth token in requests', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify({ session: createMockSession() })
            });

            await service.createSession();

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token'
                    })
                })
            );
        });
    });
});
