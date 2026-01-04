import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, type User } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';
import { BehaviorSubject } from 'rxjs';
import type { Session } from '@supabase/supabase-js';

const createMockSession = (userId: string, email: string, metadata: any = {}): Session => ({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: {
        id: userId,
        email,
        app_metadata: {},
        user_metadata: metadata,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email_confirmed_at: metadata.emailVerified ? new Date().toISOString() : undefined,
        is_anonymous: metadata.isAnonymous || false
    }
});

describe('AuthService', () => {
    let service: AuthService;
    let supabaseMock: any;
    let sessionSubject: BehaviorSubject<Session | null>;

    beforeEach(() => {
        sessionSubject = new BehaviorSubject<Session | null>(null);

        supabaseMock = {
            session$: sessionSubject.asObservable(),
            client: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({ data: { elo: 1200 }, error: null }))
                        }))
                    }))
                })),
                auth: {
                    updateUser: vi.fn(async () => ({ error: null })),
                    resetPasswordForEmail: vi.fn(async () => ({ error: null }))
                }
            },
            signIn: vi.fn(async () => ({ error: null })),
            signUp: vi.fn(async () => ({ error: null })),
            signOut: vi.fn(async () => ({ error: null })),
            ensureCurrentUserProfile: vi.fn(async () => { })
        };

        TestBed.configureTestingModule({
            providers: [AuthService, { provide: SupabaseClientService, useValue: supabaseMock }]
        });

        localStorage.clear();
        service = TestBed.inject(AuthService);
    });

    describe('Session Management', () => {
        it('should initialize with no user when no session exists', () => {
            expect(service.currentUser()).toBeNull();
        });

        it('should set currentUser when session is established', async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                user_name: 'TestUser',
                emailVerified: true,
                onboarding_completed: true
            });

            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));

            const user = service.currentUser();
            expect(user).not.toBeNull();
            expect(user?.email).toBe('test@example.com');
            expect(user?.name).toBe('TestUser');
            expect(user?.emailVerified).toBe(true);
        });

        it('should clear currentUser when session is destroyed', async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                emailVerified: true
            });

            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(service.currentUser()).not.toBeNull();

            sessionSubject.next(null);
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(service.currentUser()).toBeNull();
        });
    });

    describe('Login', () => {
        it('should successfully login with valid credentials', async () => {
            supabaseMock.signIn.mockResolvedValue({ error: null });

            const result = await service.login('test@example.com', 'password123');

            expect(result).toBe(true);
            expect(supabaseMock.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(service.error()).toBeNull();
        });

        it('should handle login errors', async () => {
            supabaseMock.signIn.mockResolvedValue({
                error: { message: 'Invalid credentials' }
            });

            const result = await service.login('test@example.com', 'wrongpassword');

            expect(result).toBe(false);
            expect(service.error()).toContain('Invalid credentials');
        });

        it('should set loading state during login', async () => {
            supabaseMock.signIn.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
            );

            const loginPromise = service.login('test@example.com', 'password123');
            expect(service.isLoading()).toBe(true);

            await loginPromise;
            expect(service.isLoading()).toBe(false);
        });
    });

    describe('Registration', () => {
        it.skip('should successfully register a new user', async () => {
            supabaseMock.signUp.mockResolvedValue({ error: null });

            const result = await service.register('NewUser', 'new@example.com', 'password123');
            if (!result) console.log('Register failed with error:', service.error());
            expect(result).toBe(true);
            expect(supabaseMock.signUp).toHaveBeenCalledWith('new@example.com', 'password123');
            expect(service.error()).toBeNull();
        });

        it('should handle registration errors', async () => {
            supabaseMock.signUp.mockResolvedValue({
                error: { message: 'Email already exists' }
            });

            const result = await service.register('NewUser', 'existing@example.com', 'password123');

            expect(result).toBe(false);
            expect(service.error()).toContain('Email already exists');
        });
    });

    describe('Profile Updates', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                user_name: 'OldName',
                avatar_url: 'old-avatar.png',
                emailVerified: true
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should update user profile', async () => {
            supabaseMock.client.auth.updateUser.mockResolvedValue({ error: null });

            await service.updateProfile({ name: 'NewName', bio: 'New bio' });

            expect(supabaseMock.client.auth.updateUser).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    user_name: 'NewName',
                    bio: 'New bio'
                })
            });
        });

        it('should handle profile update errors', async () => {
            supabaseMock.client.auth.updateUser.mockResolvedValue({
                error: { message: 'Update failed' }
            });

            await service.updateProfile({ name: 'NewName' });

            expect(service.error()).toContain('Update failed');
        });
    });

    describe('Password Management', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                emailVerified: true
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should change password successfully', async () => {
            supabaseMock.client.auth.updateUser.mockResolvedValue({ error: null });

            const result = await service.changePassword('oldpass', 'newpass123');

            expect(result).toBe(true);
            expect(supabaseMock.client.auth.updateUser).toHaveBeenCalledWith({
                password: 'newpass123'
            });
        });

        it('should reject short passwords', async () => {
            const result = await service.changePassword('oldpass', 'short');

            expect(result).toBe(false);
            expect(service.error()).toContain('trop court');
        });

        it('should reset password for email', async () => {
            supabaseMock.client.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

            const result = await service.resetPassword('test@example.com');

            expect(result).toBe(true);
            expect(supabaseMock.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
                'test@example.com',
                expect.any(Object)
            );
        });

        it('should reject invalid email for password reset', async () => {
            const result = await service.resetPassword('invalid-email');

            expect(result).toBe(false);
            expect(service.error()).toContain('invalide');
        });
    });

    describe('Email Verification', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                user_name: 'TestUser',
                emailVerified: false
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should verify email with correct code', async () => {
            const result = await service.verifyEmail('1234');

            expect(result).toBe(true);
            expect(service.currentUser()?.emailVerified).toBe(true);
        });

        it('should reject incorrect verification code', async () => {
            const result = await service.verifyEmail('wrong');

            expect(result).toBe(false);
            expect(service.error()).toContain('invalide');
        });
    });

    describe('Onboarding', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                emailVerified: true,
                onboarding_completed: false
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should complete onboarding', async () => {
            const result = await service.completeOnboarding({
                avatar: 'new-avatar.png',
                name: 'CompleteName'
            });

            expect(result).toBe(true);
            expect(service.currentUser()?.onboardingCompleted).toBe(true);
            expect(service.currentUser()?.name).toBe('CompleteName');
        });
    });

    describe('Logout', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                emailVerified: true
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should logout successfully', async () => {
            supabaseMock.signOut.mockResolvedValue({ error: null });

            await service.logout();

            expect(supabaseMock.signOut).toHaveBeenCalled();
        });

        it('should handle logout errors', async () => {
            supabaseMock.signOut.mockResolvedValue({
                error: { message: 'Logout failed' }
            });

            await service.logout();

            expect(service.error()).toContain('Logout failed');
        });
    });

    describe('ELO Management', () => {
        beforeEach(async () => {
            const session = createMockSession('user-1', 'test@example.com', {
                emailVerified: true
            });
            sessionSubject.next(session);
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should update user ELO', () => {
            service.updateElo(1350);

            expect(service.currentUser()?.elo).toBe(1350);
        });

        it('should round ELO to nearest integer', () => {
            service.updateElo(1234.567);

            expect(service.currentUser()?.elo).toBe(1235);
        });
    });
});
