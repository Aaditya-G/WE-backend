import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomUserEntity } from './room-user.entity';
import { GameStatus } from '../enums';



@Entity('ROOM')
export class RoomEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.NOT_STARTED,
  })
  game_status: GameStatus;

  @OneToMany(() => RoomUserEntity, roomUser => roomUser.room)
  roomUsers: RoomUserEntity[];
}
