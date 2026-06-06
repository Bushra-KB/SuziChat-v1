import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { RoomLiveService } from './room-live.service';

@Module({
  imports: [RoomsModule],
  providers: [RoomLiveService],
  exports: [RoomLiveService],
})
export class RoomLiveModule {}
