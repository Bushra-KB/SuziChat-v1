import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import authConfig from './config/auth.config';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';

function toJwtExpiresIn(
  value: string,
): NonNullable<JwtSignOptions['expiresIn']> {
  return value as NonNullable<JwtSignOptions['expiresIn']>;
}

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfig)],
      inject: [authConfig.KEY],
      useFactory: (config: ConfigType<typeof authConfig>) => ({
        secret: config.accessTokenSecret,
        signOptions: {
          expiresIn: toJwtExpiresIn(config.accessTokenTtl),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AuthService],
})
export class AuthModule {}
