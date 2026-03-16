import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '7d';
    process.env.ARGON2_TIME_COST = '3';
    process.env.ARGON2_MEMORY_COST = '65536';
    process.env.ARGON2_PARALLELISM = '1';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    authService = module.get(AuthService);
  });

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
  });

  it('hashes and verifies passwords with argon2', async () => {
    const password = 'super-secret-password';
    const hash = await authService.hashPassword(password);

    expect(hash).not.toEqual(password);
    await expect(authService.verifyPassword(hash, password)).resolves.toBe(
      true,
    );
  });

  it('loads users by email from prisma', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
    });

    await expect(
      authService.findUserByEmail('test@example.com'),
    ).resolves.toEqual({
      id: 'user_1',
      email: 'test@example.com',
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('signs an access token', async () => {
    const token = await authService.signAccessToken('user_1', UserRole.USER);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('registers a new user and returns tokens', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'new@example.com',
      username: 'newuser',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaMock.user.update.mockResolvedValue({});

    const result = await authService.register({
      email: 'new@example.com',
      username: 'newuser',
      password: 'super-secret-password',
      isAdultConfirmed: true,
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it('logs in with username and returns tokens', async () => {
    const passwordHash = await authService.hashPassword(
      'super-secret-password',
    );

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'login@example.com',
      username: 'loginuser',
      passwordHash,
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'login@example.com',
      username: 'loginuser',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaMock.user.update.mockResolvedValue({});

    const result = await authService.login({
      emailOrUsername: 'loginuser',
      password: 'super-secret-password',
    });

    expect(result.user.username).toBe('loginuser');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('refreshes tokens when a valid refresh token is provided', async () => {
    const refreshToken = await authService.signRefreshToken(
      'user_1',
      UserRole.USER,
    );
    const refreshTokenHash = await authService.hashRefreshToken(refreshToken);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'refresh@example.com',
      username: 'refreshuser',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      refreshTokenHash,
    });
    prismaMock.user.update.mockResolvedValue({});

    const result = await authService.refresh(refreshToken);

    expect(result.user.id).toBe('user_1');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });
});
