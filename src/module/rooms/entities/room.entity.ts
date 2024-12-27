import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { RoomUserEntity } from './room-user.entity';
import { GameStatus } from '../enums';
import { UserEntity } from 'src/module/users/entities/user.entity';
import { GiftEntity } from './gift.entity';
import { LogEntity } from './log.entity';



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

  @ManyToOne(() => UserEntity, (user) => user.createdRooms, {
    onDelete: 'CASCADE',
  })
  owner: UserEntity;

  @OneToMany(() => RoomUserEntity, roomUser => roomUser.room)
  roomUsers: RoomUserEntity[];

  @OneToMany(() => GiftEntity, gift => gift.room)
  gifts: GiftEntity[];

  @OneToMany(() => RoomUserEntity, roomUser => roomUser.room)
  participants: RoomUserEntity[];

  //onetomany for logs
  @OneToMany(() => LogEntity, log => log.room , {
    cascade: true,
  })
  logs: LogEntity[];

  @Column('simple-array', { nullable: true })
  turnOrder: number[] | null;

  @Column({ type: 'int', nullable: true })
  currentTurn: number | null;

  @Column({ type: 'int', default: 0 })
  totalStealsSoFar: number;

  @Column({ type: 'int', default: 1 })
  maxStealPerUser: number; // e.g. 1

  @Column({ type: 'int', default: 3 })
  maxStealPerGame: number; // e.g. 3
}
