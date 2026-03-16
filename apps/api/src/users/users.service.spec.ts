import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
  });

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
  });

  it('returns the current profile', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      email: 'profile@example.com',
      username: 'profileuser',
      displayName: 'Profile User',
      bio: 'Hello world',
      country: 'Ethiopia',
      role: 'USER',
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(usersService.getMyProfile('user_1')).resolves.toMatchObject({
      id: 'user_1',
      displayName: 'Profile User',
    });
  });

  it('throws when the profile is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(usersService.getMyProfile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates the current profile', async () => {
    prismaMock.user.update.mockResolvedValueOnce({
      id: 'user_1',
      email: 'profile@example.com',
      username: 'profileuser',
      displayName: 'Updated User',
      bio: 'Updated bio',
      country: 'Ireland',
      role: 'USER',
      isAdultConfirmed: true,
      isEmailVerified: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      usersService.updateMyProfile('user_1', {
        displayName: ' Updated User ',
        bio: ' Updated bio ',
        country: ' Ireland ',
      }),
    ).resolves.toMatchObject({
      displayName: 'Updated User',
      country: 'Ireland',
    });

    const updateCalls = prismaMock.user.update.mock.calls as Array<
      [
        {
          where: { id: string };
          data: {
            displayName: string;
            bio: string;
            country: string;
          };
          select: {
            id: true;
            displayName: true;
          } & Record<string, true>;
        },
      ]
    >;
    const updateArgs = updateCalls[0][0];

    expect(updateArgs.where.id).toBe('user_1');
    expect(updateArgs.data).toEqual({
      displayName: 'Updated User',
      bio: 'Updated bio',
      country: 'Ireland',
    });
    expect(updateArgs.select.id).toBe(true);
    expect(updateArgs.select.displayName).toBe(true);
  });
});
