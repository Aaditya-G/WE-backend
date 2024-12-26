import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { Room } from './room.entity';

export enum UserStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

@Entity()
export class RoomUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, user => user.roomUsers)
  user: UserEntity;

  @ManyToOne(() => Room, room => room.roomUsers)
  room: Room;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.CONNECTED,
  })
  user_status: UserStatus;
}
