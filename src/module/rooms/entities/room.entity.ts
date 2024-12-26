import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { RoomUserEntity } from './room-user.entity';
import { GameStatus } from '../enums';
import { UserEntity } from 'src/module/users/entities/user.entity';



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
}
