/**
 * Générateurs de données de test pour les tests E2E
 */

export const generateRandomEmail = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
};

export const generateRandomUsername = () => {
  const adjectives = ['Swift', 'Bold', 'Clever', 'Brave', 'Quick', 'Smart'];
  const nouns = ['Knight', 'Bishop', 'Rook', 'Queen', 'King', 'Pawn'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
};

export const generateRandomPassword = () => {
  return `Test${Math.random().toString(36).substring(2, 10)}!123`;
};

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export const createTestUser = (): TestUser => ({
  name: generateRandomUsername(),
  email: generateRandomEmail(),
  password: generateRandomPassword()
});

export interface GameConfig {
  timeMinutes: number;
  incrementSeconds: number;
}

export const gameConfigs = {
  bullet: { timeMinutes: 1, incrementSeconds: 0 },
  blitz: { timeMinutes: 3, incrementSeconds: 2 },
  rapid: { timeMinutes: 10, incrementSeconds: 5 },
  classical: { timeMinutes: 30, incrementSeconds: 30 }
};

export const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const waitForNetworkIdle = async (page: any, timeout = 2000) => {
  await page.waitForLoadState('networkidle', { timeout });
};

export const waitForAnimation = async (timeout = 500) => {
  await new Promise((resolve) => setTimeout(resolve, timeout));
};
