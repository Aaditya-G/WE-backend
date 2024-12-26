import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomUserEntity } from '../../rooms/entities/room-user.entity';
import { RoomEntity } from 'src/module/rooms/entities/room.entity';

@Entity('USER')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RoomUserEntity, roomUser => roomUser.user)
  roomUsers: RoomUserEntity[];

  @OneToMany(() => RoomEntity, (room) => room.owner)
  createdRooms: RoomEntity[];
}
