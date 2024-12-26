import { Module } from '@nestjs/common';
import { RoomsController } from './controller/rooms.controller';
import { RoomsService } from './service/rooms.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService]
})
export class RoomsModule {}
