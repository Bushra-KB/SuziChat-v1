import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import authConfig from './config/auth.config';

function toJwtExpiresIn(value: string): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  hashPassword(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: this.config.argon2.timeCost,
      memoryCost: this.config.argon2.memoryCost,
      parallelism: this.config.argon2.parallelism,
    });
  }

  verifyPassword(hash: string, password: string) {
    return argon2.verify(hash, password);
  }

  hashRefreshToken(token: string) {
    return argon2.hash(token, {
      type: argon2.argon2id,
      timeCost: this.config.argon2.timeCost,
      memoryCost: this.config.argon2.memoryCost,
      parallelism: this.config.argon2.parallelism,
    });
  }

  signAccessToken(userId: string, role: UserRole) {
    return this.jwtService.signAsync(
      { sub: userId, role },
      {
        secret: this.config.accessTokenSecret,
        expiresIn: toJwtExpiresIn(this.config.accessTokenTtl),
      },
    );
  }

  signRefreshToken(userId: string, role: UserRole) {
    return this.jwtService.signAsync(
      { sub: userId, role },
      {
        secret: this.config.refreshTokenSecret,
        expiresIn: toJwtExpiresIn(this.config.refreshTokenTtl),
      },
    );
  }
}
