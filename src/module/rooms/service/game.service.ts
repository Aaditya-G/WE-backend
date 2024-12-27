import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoomEntity } from '../entities/room.entity';
import { GiftEntity } from '../entities/gift.entity';
import { RoomUserEntity } from '../entities/room-user.entity';
import { GameState } from '../types/game-state.types';
import { GameStatus } from '../enums';
import { UserEntity } from 'src/module/users/entities/user.entity';
import { LogEntity } from '../entities/log.entity';

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
    @InjectRepository(LogEntity)
    private logRepository: Repository<LogEntity>,
  ) {}

  async initializeGameState(
    roomCode: string,
    ownerId: number,
  ): Promise<GameState> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: [
        'gifts',
        'gifts.addedBy',
        'participants',
        'participants.user',
        'participants.addedGift',
        'owner',
        'logs'
      ],
    });
    return {
      status: room.game_status,
      owner: room.owner,
      users: room.participants.map((participant) => ({
        name: participant.user.name,
        id: participant.user.id,
        isCheckedIn: participant.isCheckedIn,
        giftId: participant.addedGift?.id || null,
        receivedGiftId: null,
      })),
      gifts: room.gifts.map((gift) => ({
        id: gift.id,
        name: gift.name,
        addedById: gift.addedBy.id,
        receivedById: gift.receivedBy?.id || null,
      })),
      currentTurn: null,
      totalStealsSoFar: 0,
      maxStealPerUser: 1,
      maxStealPerGame: 3,
      turnOrder: [],
      logs: room.logs,
    };
  }

  async getGameState(roomCode: string): Promise<GameState> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: [
        'owner',
        'gifts',
        'gifts.addedBy',
        'gifts.receivedBy',
        'participants',
        'participants.user',
        'participants.addedGift',
        'logs'
      ],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Transform to your custom DTO (GameState)
    return {
      status: room.game_status,
      owner: room.owner,
      users: room.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        isCheckedIn: p.isCheckedIn,
        giftId: p.addedGift?.id || null,
        receivedGiftId:
          room.gifts.find((g) => g.receivedBy?.id === p.user.id)?.id || null,
        stealsSoFar: p.stealsSoFar, // can optionally return that too
      })),
      gifts: room.gifts.map((gift) => ({
        id: gift.id,
        name: gift.name,
        addedById: gift.addedBy.id,
        receivedById: gift.receivedBy?.id || null,
      })),
      currentTurn: room.currentTurn,
      totalStealsSoFar: room.totalStealsSoFar,
      maxStealPerUser: room.maxStealPerUser,
      maxStealPerGame: room.maxStealPerGame,
      turnOrder: room.turnOrder,
      logs: room.logs
    };
  }

  async addGift(
    userId: number,
    roomCode: string,
    giftName: string,
  ): Promise<void> {
    try {
      const roomUser = await this.roomUserRepository.findOne({
        where: { user: { id: userId }, room: { code: roomCode } },
        relations: ['room', 'addedGift' , 'user'],
      });

      console.log(roomUser)
  
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
      
      Logger.log(roomUser.user.name + " added a gift");
      await this.addLog(roomCode, `${roomUser.user.name} added a gift`);
  
      await this.giftRepository.save(gift);
      roomUser.addedGift = gift;
      await this.roomUserRepository.save(roomUser);
      Logger.log(roomUser.user.name + " added a gift");
    } catch (error) {
      Logger.log(error);
    }
    
    
  }

  async checkIn(userId: number, roomCode: string): Promise<void> {
    const roomUser = await this.roomUserRepository.findOne({
      where: { user: { id: userId }, room: { code: roomCode } },
      relations: ['addedGift' , 'user'],
    });

    if (!roomUser) {
      throw new NotFoundException('User not in room');
    }

    if (!roomUser.addedGift) {
      throw new BadRequestException('Must add gift before checking in');
    }

    roomUser.isCheckedIn = true;
    await this.roomUserRepository.save(roomUser);
    await this.addLog(roomCode, `${roomUser.user.name} checked in`);
  }

  async startChecking(userId: number, roomCode: string): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: ['owner' , ],
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
    await this.addLog(roomCode, 'Check In Started!, Participants can now check in');
  }

  async startGame(
    userId: number,
    roomCode: string,
    maxStealPerUser: number,
    maxStealPerGame: number,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: ['owner', 'participants', 'participants.user'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Only the owner can start the game
    if (room.owner.id !== userId) {
      throw new BadRequestException('Only the owner can start the game');
    }

    // Make sure the game is in the correct state
    if (room.game_status !== GameStatus.CHECKIN) {
      throw new BadRequestException('Game not in a valid state to start');
    }

    // Mark the game status as ongoing
    room.game_status = GameStatus.ONGOING;

    // Build turn order from the participants
    const participantIds = room.participants.map((p) => p.user.id);
    // e.g. randomize or keep the same order
    room.turnOrder = participantIds;

    //randomize the turnOrder
    room.turnOrder = room.turnOrder.sort(() => Math.random() - 0.5);

    // First user in the order gets the first turn
    room.currentTurn = participantIds[0];

    // Setup steals
    room.maxStealPerUser = maxStealPerUser;
    room.maxStealPerGame = maxStealPerGame;
    room.totalStealsSoFar = 0;

    // Save changes
    await this.roomRepository.save(room);
    await this.addLog(roomCode, 'Game started!, Participants can now pick or steal gifts');
  }

  async pickGift(
    userId: number,
    roomCode: string,
    giftId: number,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: [
        'participants',
        'participants.user',
        'gifts',
        'gifts.addedBy',
      ],
    });
    if (!room) throw new NotFoundException('Room not found');

    if (room.game_status !== GameStatus.ONGOING) {
      throw new BadRequestException('Game is not ongoing');
    }

    if (room.currentTurn !== userId) {
      throw new BadRequestException('It is not your turn');
    }

    // Find the gift
    const gift = room.gifts.find((g) => g.id === giftId);
    if (!gift) {
      throw new NotFoundException('Gift not found');
    }
    if (gift.receivedBy) {
      throw new BadRequestException('Gift has already been taken');
    }

    gift.receivedBy = { id: userId } as UserEntity;
    

    if (!room.turnOrder || room.turnOrder.length === 0) return;
    room.turnOrder.shift();

    if(room.turnOrder.length == 0){
      room.currentTurn = null;
      room.game_status = GameStatus.FINISHED;
    }
    else{
      room.currentTurn = room.turnOrder[0];
    }
    await this.roomRepository.save(room);
    await this.giftRepository.save(gift);

    await this.addLog(roomCode, `${room.participants.find((p) => p.user.id === userId).user.name} picked a gift called`);
  }

  async stealGift(
    userId: number,
    roomCode: string,
    giftId: number,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: [
        'participants',
        'participants.user',
        'gifts',
        'gifts.addedBy',
      ],
    });
    if (!room) throw new NotFoundException('Room not found');

    if (room.game_status !== GameStatus.ONGOING) {
      throw new BadRequestException('Game is not ongoing');
    }

    if (room.currentTurn !== userId) {
      throw new BadRequestException('Not your turn');
    }

    if (room.totalStealsSoFar >= room.maxStealPerGame) {
      throw new BadRequestException('Max steals reached for this game');
    }

    const gift = room.gifts.find((g) => g.id === giftId);
    if (!gift || !gift.receivedBy) {
      throw new BadRequestException('Gift not currently owned by any player');
    }
    if (gift.receivedBy.id === userId) {
      throw new BadRequestException('Cannot steal your own gift');
    }

    const roomUser = room.participants.find((p) => p.user.id === userId);
    if (!roomUser) {
      throw new NotFoundException('User not found in this room');
    }
    if (roomUser.stealsSoFar >= room.maxStealPerUser) {
      throw new BadRequestException('You have no steals remaining');
    }

    roomUser.stealsSoFar += 1;
    room.totalStealsSoFar += 1;
    await this.roomUserRepository.save(roomUser);

    const stolenFromUserId = gift.receivedBy.id;

    gift.receivedBy = { id: userId } as UserEntity;
    await this.giftRepository.save(gift);

    await this.setNextTurnAfterSteal(room, stolenFromUserId);
    await this.addLog(roomCode, `${room.participants.find((p) => p.user.id === userId).user.name} stole a gift from ${room.participants.find((p) => p.user.id === stolenFromUserId).user.name}`);
  }

  private  setNextTurnAfterSteal = async (
    room: RoomEntity,
    stolenFromUserId: number,
  ): Promise<void> => {
    if (!room.turnOrder || room.turnOrder.length === 0) return;
    const currentIndex = room.turnOrder.findIndex(
      (id) => id === room.currentTurn,
    );
    if (currentIndex !== -1) {
      room.turnOrder.splice(currentIndex, 1);
    }
    const stolenFromIndex = room.turnOrder.indexOf(stolenFromUserId);
    if (stolenFromIndex === -1) {
      room.turnOrder.unshift(stolenFromUserId);
    }
    room.currentTurn = stolenFromUserId;

    await this.roomRepository.save(room);
  }

  async addLog(roomCode: string, message: string): Promise<void> {
    Logger.log("add log was called")
    const room = await this.roomRepository.findOne({
      where: { code: roomCode },
      relations: ['logs'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const log = new LogEntity();
    log.action = message;
    log.index = room.logs.length;
    room.logs.push(log);
    await this.roomRepository.save(room);
  }
}
