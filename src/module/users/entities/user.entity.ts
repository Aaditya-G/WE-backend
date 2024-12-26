import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomUser } from '../../rooms/entities/room-user.entity';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RoomUser, roomUser => roomUser.user)
  roomUsers: RoomUser[];
}
