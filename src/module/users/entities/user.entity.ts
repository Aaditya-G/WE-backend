import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomUserEntity } from '../../rooms/entities/room-user.entity';

@Entity('USER')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => RoomUserEntity, roomUser => roomUser.user)
  roomUsers: RoomUserEntity[];
}
