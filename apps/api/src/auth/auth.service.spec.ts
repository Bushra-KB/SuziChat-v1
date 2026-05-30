import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEmailService } from './auth-email.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { RegisterGender } from './dto/register.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let authEmailService: AuthEmailService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
    authEmailService = module.get(AuthEmailService);
  });

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('registers a new user and returns verification state', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user_1',
      email: 'new@example.com',
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      birthday: new Date('2000-01-01T00:00:00.000Z'),
      gender: 'PREFER_NOT_TO_SAY',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await authService.register({
      firstName: 'New',
      lastName: 'User',
      birthday: '2000-01-01',
      gender: RegisterGender.PREFER_NOT_TO_SAY,
      email: 'new@example.com',
      password: 'super-secret-password',
      isAdultConfirmed: true,
      termsAccepted: true,
      privacyAccepted: true,
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result.requiresEmailVerification).toBe(true);
    expect(result.emailVerificationTokenExpiresAt).toEqual(expect.any(String));
    expect(prismaMock.user.create).toHaveBeenCalled();
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
      isEmailVerified: true,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'login@example.com',
      username: 'loginuser',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: true,
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

  it('returns the current user or throws when missing', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'current@example.com',
      username: 'currentuser',
      role: UserRole.USER,
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      authService.getCurrentUserOrThrow('user_1'),
    ).resolves.toMatchObject({
      id: 'user_1',
      email: 'current@example.com',
    });
  });

  it('returns a generic forgot-password response when no user exists', async () => {
    jest.spyOn(authEmailService, 'isConfigured', 'get').mockReturnValue(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      authService.forgotPassword('forgot@example.com'),
    ).resolves.toEqual({
      message:
        'If an account exists for this email, a password reset link will be sent.',
    });
  });

  it('rejects forgot-password requests when email delivery is not configured', async () => {
    jest.spyOn(authEmailService, 'isConfigured', 'get').mockReturnValue(false);

    await expect(
      authService.forgotPassword('forgot@example.com'),
    ).rejects.toThrow('Password reset email delivery is not configured.');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('creates a password reset token and emails existing users', async () => {
    jest.spyOn(authEmailService, 'isConfigured', 'get').mockReturnValue(true);
    const sendPasswordResetEmail = jest
      .spyOn(authEmailService, 'sendPasswordResetEmail')
      .mockResolvedValueOnce(true);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'forgot@example.com',
      username: 'forgotuser',
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    const result = await authService.forgotPassword('forgot@example.com');

    expect(result).toEqual({
      message:
        'If an account exists for this email, a password reset link will be sent.',
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'forgot@example.com',
      username: 'forgotuser',
      token: expect.any(String),
    });
    const forgotPasswordUpdateCalls = prismaMock.user.update.mock
      .calls as Array<
      [
        {
          where: { id: string };
          data: {
            passwordResetTokenHash: string;
            passwordResetTokenExpiresAt: Date;
          };
        },
      ]
    >;
    const forgotPasswordUpdateArgs = forgotPasswordUpdateCalls[0][0];

    expect(forgotPasswordUpdateArgs.where.id).toBe('user_1');
    expect(forgotPasswordUpdateArgs.data.passwordResetTokenHash).toEqual(
      expect.any(String),
    );
    expect(forgotPasswordUpdateArgs.data.passwordResetTokenExpiresAt).toBeInstanceOf(
      Date,
    );
  });

  it('resets the password with a valid reset token', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'user_1',
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    await expect(
      authService.resetPassword('reset-token', 'new-password-123'),
    ).resolves.toEqual({
      message: 'Password has been reset successfully. You can now sign in.',
    });

    expect(prismaMock.user.findFirst).toHaveBeenCalled();
    const resetPasswordUpdateCalls = prismaMock.user.update.mock.calls as Array<
      [
        {
          where: { id: string };
          data: {
            passwordHash: string;
            refreshTokenHash: null;
            passwordResetTokenHash: null;
            passwordResetTokenExpiresAt: null;
          };
        },
      ]
    >;
    const resetPasswordUpdateArgs = resetPasswordUpdateCalls[0][0];

    expect(resetPasswordUpdateArgs.where.id).toBe('user_1');
    expect(resetPasswordUpdateArgs.data.passwordHash).toEqual(
      expect.any(String),
    );
    expect(resetPasswordUpdateArgs.data.refreshTokenHash).toBeNull();
    expect(resetPasswordUpdateArgs.data.passwordResetTokenHash).toBeNull();
    expect(resetPasswordUpdateArgs.data.passwordResetTokenExpiresAt).toBeNull();
  });

  it('changes the password when the current password is valid', async () => {
    const passwordHash = await authService.hashPassword('current-password-123');

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      passwordHash,
    });
    prismaMock.user.update.mockResolvedValueOnce({});

    await expect(
      authService.changePassword(
        'user_1',
        'current-password-123',
        'new-password-123',
      ),
    ).resolves.toEqual({ message: 'Password changed successfully.' });

    const changePasswordUpdateCalls = prismaMock.user.update.mock
      .calls as Array<
      [
        {
          where: { id: string };
          data: {
            passwordHash: string;
            passwordResetTokenHash: null;
            passwordResetTokenExpiresAt: null;
          };
        },
      ]
    >;
    const changePasswordUpdateArgs = changePasswordUpdateCalls[0][0];

    expect(changePasswordUpdateArgs.where.id).toBe('user_1');
    expect(changePasswordUpdateArgs.data.passwordHash).toEqual(
      expect.any(String),
    );
    expect(changePasswordUpdateArgs.data.passwordResetTokenHash).toBeNull();
    expect(
      changePasswordUpdateArgs.data.passwordResetTokenExpiresAt,
    ).toBeNull();
  });
});
