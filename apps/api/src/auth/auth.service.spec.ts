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
  });

  it('hashes and verifies passwords with argon2', async () => {
    const password = 'super-secret-password';
    const hash = await authService.hashPassword(password);

    expect(hash).not.toEqual(password);
    await expect(authService.verifyPassword(hash, password)).resolves.toBe(true);
  });

  it('loads users by email from prisma', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
    });

    await expect(authService.findUserByEmail('test@example.com')).resolves.toEqual(
      {
        id: 'user_1',
        email: 'test@example.com',
      },
    );
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('signs an access token', async () => {
    const token = await authService.signAccessToken('user_1', UserRole.USER);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });
});
