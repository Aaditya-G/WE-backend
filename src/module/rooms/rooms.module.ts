import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from './entities/room.entity';
import { RoomUserEntity } from './entities/room-user.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RoomsController } from './controller/rooms.controller';
import { RoomsGateway } from './gateway/rooms.gateway';
import { RoomsService } from './service/rooms.service';


@Module({
  imports: [TypeOrmModule.forFeature([RoomEntity, RoomUserEntity, UserEntity])],
  providers: [RoomsService, RoomsGateway],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
