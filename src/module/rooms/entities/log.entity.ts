import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { RoomEntity } from './room.entity';
import { UserEntity } from 'src/module/users/entities/user.entity';

@Entity('LOG')
export class LogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  index: number;

  @ManyToOne(() => RoomEntity, (room) => room.logs)
  room: RoomEntity;

  @Column({ nullable: false })
  action: string;
}
