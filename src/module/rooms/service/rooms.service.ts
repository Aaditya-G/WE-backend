import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GameStatus, RoomEntity } from '../entities/room.entity';
import { UserEntity } from 'src/module/users/entities/user.entity';
import { RoomUserEntity, UserStatus } from '../entities/room-user.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomEntity)
    private roomsRepository: Repository<RoomEntity>,
    @InjectRepository(RoomUserEntity)
    private roomUsersRepository: Repository<RoomUserEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async createRoom(userId: number): Promise<{ room: RoomEntity; code: string }> {
    const code = this.generateRoomCode();
    const room = this.roomsRepository.create({ code, game_status: GameStatus.NOT_STARTED });
    await this.roomsRepository.save(room);

    const user = await this.usersRepository.findOne({
        where :{
            id: userId
        }
    });
    if (!user) throw new NotFoundException('User not found');

    const roomUser = this.roomUsersRepository.create({
      user,
      room,
      user_status: UserStatus.CONNECTED,
    });
    await this.roomUsersRepository.save(roomUser);

    return { room, code };
  }

  async joinRoom(userId: number, code: string): Promise<RoomEntity> {
    const room = await this.roomsRepository.findOne({ where: { code }, relations: ['roomUsers'] });
    if (!room) throw new NotFoundException('Room not found');

    const user = await this.usersRepository.findOne({
        where :{
            id: userId
        }
    });
    if (!user) throw new NotFoundException('User not found');

    // Check if user is already in the room
    const existing = await this.roomUsersRepository.findOne({ where: { user, room } });
    if (existing) {
      existing.user_status = UserStatus.CONNECTED;
      await this.roomUsersRepository.save(existing);
    } else {
      const roomUser = this.roomUsersRepository.create({
        user,
        room,
        user_status: UserStatus.CONNECTED,
      });
      await this.roomUsersRepository.save(roomUser);
    }

    return room;
  }

  private generateRoomCode(): string {
    return uuidv4().split('-')[0]; // Simple code generation; consider more robust methods
  }

  // Additional room-related methods
}
