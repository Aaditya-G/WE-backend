import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomEntity } from '../entities/room.entity';
import { GiftEntity } from '../entities/gift.entity';
import { RoomUserEntity } from '../entities/room-user.entity';
import { GameState } from '../types/game-state.types';
import { GameStatus } from '../enums';
import { UserEntity } from 'src/module/users/entities/user.entity';


@Injectable()
export class GameService {
  constructor(
    @InjectRepository(RoomEntity)
    private roomRepository: Repository<RoomEntity>,
    @InjectRepository(GiftEntity)
    private giftRepository: Repository<GiftEntity>,
    @InjectRepository(RoomUserEntity)
    private roomUserRepository: Repository<RoomUserEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async initializeGameState(roomCode: string, ownerId: number): Promise<GameState> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: ['gifts', 'participants', 'participants.user', 'participants.addedGift'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // If room doesn't have status set, set it to NOT_STARTED
    if (!room.game_status) {
      room.game_status = GameStatus.NOT_STARTED;
      const owner = await this.userRepository.findOne({
        where: { id: ownerId },
      });
      room.owner = owner;
      await this.roomRepository.save(room);
    }

    return {
      status: room.game_status,
      owner: room.owner,
      users: room.participants.map(participant => ({
        id: participant.user.id,
        isCheckedIn: participant.isCheckedIn,
        giftId: participant.addedGift?.id || null,
        receivedGiftId: null,
      })),
      gifts: room.gifts.map(gift => ({
        id: gift.id,
        name: gift.name,
        addedById: gift.addedBy.id,
        receivedById: gift.receivedBy?.id || null,
      })),
      currentTurn: null,
    };
  }

  async getGameState(roomCode: string): Promise<GameState> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: ['gifts', 'participants', 'participants.user', 'participants.addedGift'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return {
      status: room.game_status,
      owner: room.owner,
      users: room.participants.map(participant => ({
        id: participant.user.id,
        isCheckedIn: participant.isCheckedIn,
        giftId: participant.addedGift?.id || null,
        receivedGiftId: null,
      })),
      gifts: room.gifts.map(gift => ({
        id: gift.id,
        name: gift.name,
        addedById: gift.addedBy.id,
        receivedById: gift.receivedBy?.id || null,
      })),
      currentTurn: null,
    };
  }

  async addGift(userId: number, roomCode: string, giftName: string): Promise<void> {
    const roomUser = await this.roomUserRepository.findOne({
      where: { user: { id: userId }, room: { code: roomCode } },
      relations: ['room', 'addedGift'],
    });

    if (!roomUser) {
      throw new NotFoundException('User not in room');
    }

    if (roomUser.addedGift) {
      throw new BadRequestException('User already added a gift');
    }

    const gift = this.giftRepository.create({
      name: giftName,
      room: roomUser.room,
      addedBy: { id: userId },
    });

    await this.giftRepository.save(gift);
    roomUser.addedGift = gift;
    await this.roomUserRepository.save(roomUser);
  }

  async checkIn(userId: number, roomCode: string): Promise<void> {
    const roomUser = await this.roomUserRepository.findOne({
      where: { user: { id: userId }, room: { code: roomCode } },
      relations: ['addedGift'],
    });

    if (!roomUser) {
      throw new NotFoundException('User not in room');
    }

    if (!roomUser.addedGift) {
      throw new BadRequestException('Must add gift before checking in');
    }

    roomUser.isCheckedIn = true;
    await this.roomUserRepository.save(roomUser);
  }

  async startChecking(userId: number, roomCode: string): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.owner.id !== userId) {
      throw new BadRequestException('Only owner can start checking');
    }

    if (room.game_status !== GameStatus.NOT_STARTED) {
      throw new BadRequestException('Game already started');
    }

    room.game_status = GameStatus.CHECKIN;
    await this.roomRepository.save(room);
  }
}