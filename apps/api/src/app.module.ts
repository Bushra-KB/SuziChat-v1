import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DatingModule } from './dating/dating.module';
import { FriendsModule } from './friends/friends.module';
import { GamesModule } from './games/games.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RoomsModule } from './rooms/rooms.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Prefer apps/api/.env; fall back to monorepo root when you run `pnpm start:dev` from apps/api.
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '..', '.env')],
    }),
    PrismaModule,
    AdminModule,
    AuthModule,
    FriendsModule,
    UsersModule,
    PublicModule,
    RoomsModule,
    ConversationsModule,
    GamesModule,
    RealtimeModule,
    PostsModule,
    NotificationsModule,
    DatingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
