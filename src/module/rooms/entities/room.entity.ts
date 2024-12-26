import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomUser } from './room-user.entity';


export enum GameStatus {
  NOT_STARTED = 'NOT_STARTED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
}

@Entity()
export class Room {
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

  @OneToMany(() => RoomUser, roomUser => roomUser.room)
  roomUsers: RoomUser[];
}
