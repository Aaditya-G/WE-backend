import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { RoomEntity } from './room.entity';
import { UserEntity } from 'src/module/users/entities/user.entity';

@Entity('GIFT')
export class GiftEntity  {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => RoomEntity, room => room.gifts)
  room: RoomEntity;

  @ManyToOne(() => UserEntity, )
  addedBy: UserEntity;

  @ManyToOne(() => UserEntity , { nullable: true })
  receivedBy: UserEntity | null;
}