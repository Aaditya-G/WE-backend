import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RoomEntity } from '../entities/room.entity';
import { UserEntity } from 'src/module/users/entities/user.entity';
import { RoomUserEntity} from '../entities/room-user.entity';
import { GameStatus, UserStatus } from '../enums';

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

  const user = await this.usersRepository.findOne({
    where: { id: userId },
  });
  if (!user) throw new NotFoundException('User not found');

  const room = this.roomsRepository.create({
    code,
    game_status: GameStatus.NOT_STARTED,
    owner: user, 
  });
  await this.roomsRepository.save(room);

  const roomUser = this.roomUsersRepository.create({
    user,
    room,
    user_status: UserStatus.CONNECTED,
  });
  await this.roomUsersRepository.save(roomUser);

  return { room, code };
}


async joinRoom(userId: number, code: string): Promise<RoomEntity> {
  const room = await this.roomsRepository
    .createQueryBuilder('room')
    .leftJoinAndSelect('room.roomUsers', 'roomUser', 'roomUser.userId = :userId', { userId })
    .where('room.code = :code', { code })
    .getOne();

  if (!room) throw new NotFoundException('Room not found');

  // User exists in room
  if (room.roomUsers && room.roomUsers.length > 0) {
    await this.roomUsersRepository
      .createQueryBuilder()
      .update(RoomUserEntity)
      .set({ user_status: UserStatus.CONNECTED })
      .where('userId = :userId AND roomId = :roomId', {
        userId,
        roomId: room.id,
      })
      .execute();
  } else {
    // Insert new room user in a single query
    await this.roomUsersRepository
      .createQueryBuilder()
      .insert()
      .into(RoomUserEntity)
      .values({
        user: { id: userId },
        room: { id: room.id },
        user_status: UserStatus.CONNECTED,
      })
      .execute();
  }

  return room;
}

  private generateRoomCode(): string {
    return uuidv4().split('-')[0]; // Simple code generation; consider more robust methods
  }

  async leaveRoom(userId: number, code: string): Promise<void> {
    const room = await this.roomsRepository.findOne({ 
      where: { code },
      relations: ['roomUsers', 'owner'] 
    });
    
    if (!room) {
      throw new NotFoundException('Room not found');
    }
  
    const user = await this.usersRepository.findOne({
      where: { id: userId }
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const roomUser = await this.roomUsersRepository.findOne({
      where: { 
        user: { id: userId },
        room: { id: room.id }
      }
    });
  
    if (!roomUser) {
      throw new NotFoundException('User is not in this room');
    }
  
    // If the leaving user is the owner and there are other users
    if (room.owner.id === userId) {
      const otherRoomUsers = await this.roomUsersRepository.find({
        where: { 
          room: { id: room.id },
          user: { id: Not(userId) },
          user_status: UserStatus.CONNECTED
        },
        relations: ['user']
      });
  
      if (otherRoomUsers.length > 0) {
        // Transfer ownership to the next connected user
        room.owner = otherRoomUsers[0].user;
        await this.roomsRepository.save(room);
      } else {
        room.game_status = GameStatus.FINISHED;
        // // If no other users, delete the room
        await this.roomsRepository.save(room);
        return;
      }
    }
  
    roomUser.user_status = UserStatus.DISCONNECTED;
    await this.roomUsersRepository.save(roomUser);
  }

async getRoomInfo(code: string): Promise<RoomEntity> {
  const room = await this.roomsRepository.findOne({
    where: { code },
    relations: ['owner', 'roomUsers', 'roomUsers.user'],
  });
  if (!room) {
    throw new NotFoundException('Room not found');
  }
  return room;
}
}
