import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { RoomEntity } from './room.entity';

export enum UserStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

@Entity('ROOM_USER')
export class RoomUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, user => user.roomUsers)
  user: UserEntity;

  @ManyToOne(() => RoomEntity, room => room.roomUsers)
  room: RoomEntity;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.CONNECTED,
  })
  user_status: UserStatus;
}
