import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { AuthEmailService } from './auth-email.service';
import authConfig from './config/auth.config';
import type { GoogleAuthDto } from './dto/google-auth.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthTokenPayload } from './auth.types';

function toJwtExpiresIn(
  value: string,
): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}

function toJwtSecret(value: string): NonNullable<JwtVerifyOptions['secret']> {
  return value as NonNullable<JwtVerifyOptions['secret']>;
}

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  isAdultConfirmed: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PublicUser = Awaited<ReturnType<AuthService['getCurrentUser']>>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim();
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildVerificationToken() {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authEmail: AuthEmailService,
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

  async register(registerDto: RegisterDto) {
    const email = normalizeEmail(registerDto.email ?? '');
    const username = normalizeUsername(registerDto.username ?? '');
    const password = registerDto.password ?? '';

    this.validateRegistrationInput({
      email,
      username,
      password,
      isAdultConfirmed: registerDto.isAdultConfirmed,
      termsAccepted: registerDto.termsAccepted,
      privacyAccepted: registerDto.privacyAccepted,
    });

    const [existingEmailUser, existingUsernameUser] = await Promise.all([
      this.findUserByEmail(email),
      this.findUserByUsername(username),
    ]);

    if (existingEmailUser) {
      throw new ConflictException('Email is already in use');
    }

    if (existingUsernameUser) {
      throw new ConflictException('Username is already in use');
    }

    const passwordHash = await this.hashPassword(password);
    const verificationToken = buildVerificationToken();
    const verificationExpiresAt = new Date(
      Date.now() + this.config.emailVerificationTtlMinutes * 60 * 1000,
    );
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        isAdultConfirmed: true,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        emailVerificationTokenHash: hashResetToken(verificationToken),
        emailVerificationTokenExpiresAt: verificationExpiresAt,
      },
      select: publicUserSelect,
    });

    await this.authEmail.sendVerificationEmail({
      to: user.email,
      username: user.username,
      token: verificationToken,
    });

    return {
      message:
        'Account created. Please check your email to verify your account before signing in.',
      requiresEmailVerification: true,
      emailVerificationTokenExpiresAt: verificationExpiresAt.toISOString(),
      emailVerificationTokenPreview: this.authEmail.isConfigured
        ? undefined
        : verificationToken,
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const identifier = (loginDto.emailOrUsername ?? '').trim();
    const password = loginDto.password ?? '';

    if (!identifier || !password) {
      throw new BadRequestException(
        'Email or username and password are required',
      );
    }

    const user = identifier.includes('@')
      ? await this.prisma.user.findUnique({
          where: { email: normalizeEmail(identifier) },
        })
      : await this.prisma.user.findUnique({
          where: { username: normalizeUsername(identifier) },
        });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.verifyPassword(
      user.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }

    const publicUser = await this.getCurrentUser(user.id);

    if (!publicUser) {
      throw new UnauthorizedException('User account not found');
    }

    return this.issueAuthResponse(publicUser);
  }

  async refresh(refreshToken: string) {
    const token = refreshToken?.trim();

    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        ...publicUserSelect,
        refreshTokenHash: true,
      },
    });

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    const isRefreshTokenValid = await this.verifyPassword(
      user.refreshTokenHash,
      token,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    return this.issueAuthResponse(user);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = normalizeEmail(email ?? '');

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      throw new BadRequestException('Email must be valid');
    }

    const user = await this.findUserByEmail(normalizedEmail);

    if (!user) {
      return {
        message:
          'If an account exists for this email, a password reset flow will be sent.',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(
      Date.now() + this.config.passwordResetTtlMinutes * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });

    await this.authEmail.sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      token: resetToken,
    });

    return {
      message:
        'If an account exists for this email, a password reset flow will be sent.',
      resetTokenExpiresAt: expiresAt.toISOString(),
      resetTokenPreview: this.authEmail.isConfigured ? undefined : resetToken,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const normalizedToken = token?.trim();
    const normalizedPassword = newPassword?.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Reset token is required');
    }

    if (!normalizedPassword || normalizedPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: hashResetToken(normalizedToken),
        passwordResetTokenExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }

    const passwordHash = await this.hashPassword(normalizedPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password has been reset successfully. You can now sign in.',
    };
  }

  async verifyEmail(token: string) {
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: hashResetToken(normalizedToken),
        emailVerificationTokenExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Verification link is invalid or expired',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully. You can now sign in.' };
  }

  async resendVerification(email: string) {
    const normalizedEmail = normalizeEmail(email ?? '');

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      throw new BadRequestException('Email must be valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        isEmailVerified: true,
      },
    });

    if (!user || user.isEmailVerified) {
      return {
        message:
          'If an unverified account exists for this email, a verification link will be sent.',
      };
    }

    const verificationToken = buildVerificationToken();
    const verificationExpiresAt = new Date(
      Date.now() + this.config.emailVerificationTtlMinutes * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: hashResetToken(verificationToken),
        emailVerificationTokenExpiresAt: verificationExpiresAt,
      },
    });

    await this.authEmail.sendVerificationEmail({
      to: user.email,
      username: user.username,
      token: verificationToken,
    });

    return {
      message:
        'If an unverified account exists for this email, a verification link will be sent.',
      emailVerificationTokenExpiresAt: verificationExpiresAt.toISOString(),
      emailVerificationTokenPreview: this.authEmail.isConfigured
        ? undefined
        : verificationToken,
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const credential = googleAuthDto.credential?.trim();

    if (!credential) {
      throw new BadRequestException('Google credential is required');
    }

    if (!this.config.googleClientId) {
      throw new BadRequestException('Google sign-in is not configured');
    }

    const client = new OAuth2Client(this.config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: this.config.googleClientId,
    });
    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = normalizeEmail(payload?.email ?? '');

    if (!googleId || !email) {
      throw new UnauthorizedException('Google account is missing email data');
    }

    if (!payload?.email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const existingGoogleUser = await this.prisma.user.findUnique({
      where: { googleId },
      select: publicUserSelect,
    });

    if (existingGoogleUser) {
      return this.issueAuthResponse(existingGoogleUser);
    }

    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        ...publicUserSelect,
        googleId: true,
      },
    });

    if (existingEmailUser) {
      const linkedUser = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          googleId,
          isEmailVerified: true,
          emailVerificationTokenHash: null,
          emailVerificationTokenExpiresAt: null,
          displayName: existingEmailUser.displayName || payload.name || null,
          avatarUrl: existingEmailUser.avatarUrl || payload.picture || null,
        },
        select: publicUserSelect,
      });
      return this.issueAuthResponse(linkedUser);
    }

    if (
      !googleAuthDto.isAdultConfirmed ||
      !googleAuthDto.termsAccepted ||
      !googleAuthDto.privacyAccepted
    ) {
      throw new BadRequestException(
        'Create account with Google requires age, terms, and privacy acceptance',
      );
    }

    const username = await this.buildUniqueUsername(
      payload.name || email.split('@')[0] || 'suziuser',
    );
    const passwordHash = await this.hashPassword(
      randomBytes(32).toString('hex'),
    );
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        displayName: payload.name || null,
        avatarUrl: payload.picture || null,
        googleId,
        passwordHash,
        isAdultConfirmed: true,
        isEmailVerified: true,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
      select: publicUserSelect,
    });

    return this.issueAuthResponse(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const current = currentPassword ?? '';
    const next = newPassword?.trim();

    if (!current) {
      throw new BadRequestException('Current password is required');
    }

    if (!next || next.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    const isCurrentPasswordValid = await this.verifyPassword(
      user.passwordHash,
      current,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(next);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { message: 'Password changed successfully.' };
  }

  getCurrentUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
  }

  async getCurrentUserOrThrow(userId: string) {
    const user = await this.getCurrentUser(userId);

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    return user;
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

  async verifyAccessToken(accessToken: string) {
    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(accessToken, {
        secret: toJwtSecret(this.config.accessTokenSecret),
      });
    } catch {
      throw new UnauthorizedException('Access token is invalid');
    }
  }

  async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: toJwtSecret(this.config.refreshTokenSecret),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid');
    }
  }

  private validateRegistrationInput(input: {
    email: string;
    username: string;
    password: string;
    isAdultConfirmed: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  }) {
    if (!input.email || !input.username || !input.password) {
      throw new BadRequestException(
        'Email, username, and password are required',
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(input.email)) {
      throw new BadRequestException('Email must be valid');
    }

    if (input.username.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }

    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (!input.isAdultConfirmed) {
      throw new BadRequestException('18+ confirmation is required');
    }

    if (!input.termsAccepted) {
      throw new BadRequestException('Terms acceptance is required');
    }

    if (!input.privacyAccepted) {
      throw new BadRequestException('Privacy policy acceptance is required');
    }
  }

  private async buildUniqueUsername(base: string) {
    const normalized = normalizeUsername(
      base
        .replace(/[^a-zA-Z0-9_ -]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ).slice(0, 24);
    const fallback = normalized.length >= 3 ? normalized : 'suziuser';
    let candidate = fallback;
    let suffix = 1;

    while (await this.findUserByUsername(candidate)) {
      suffix += 1;
      candidate = `${fallback}${suffix}`;
    }

    return candidate;
  }

  private async issueAuthResponse(user: PublicUser & { role: UserRole }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user.id, user.role),
      this.signRefreshToken(user.id, user.role),
    ]);

    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
      },
    };
  }
}
