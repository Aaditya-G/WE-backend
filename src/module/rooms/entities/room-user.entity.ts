import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { RoomEntity } from './room.entity';
import { UserStatus } from '../enums';
import { GiftEntity } from './gift.entity';

@Entity('ROOM_USER')
export class RoomUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.roomUsers)
  user: UserEntity;

  @ManyToOne(() => RoomEntity, (room) => room.roomUsers)
  room: RoomEntity;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.CONNECTED,
  })
  user_status: UserStatus;

  @Column({ default: false })
  isCheckedIn: boolean;

  @OneToOne(() => GiftEntity, { nullable: true })
  @JoinColumn()
  addedGift: GiftEntity | null;

  @Column({ type: 'int', default: 0 })
  stealsSoFar: number;
}
