import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../service/rooms.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GameService } from '../service/game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap: Map<number, string> = new Map();
  private userRoomMap: Map<number, string> = new Map();
  private connectionInProgress: Map<number, boolean> = new Map();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  async handleConnection(client: Socket) {}

  async handleDisconnect(client: Socket) {
    // Find and cleanup user associated with this socket
    // let userIdToRemove: number | undefined;
    // for (const [userId, socketId] of this.userSocketMap.entries()) {
    //   if (socketId === client.id) {
    //     userIdToRemove = userId;
    //     break;
    //   }
    // }
    // if (userIdToRemove) {
    //   const roomCode = this.userRoomMap.get(userIdToRemove);
    //   if (roomCode) {
    //     await this.roomsService.leaveRoom(userIdToRemove, roomCode);
    //     this.userSocketMap.delete(userIdToRemove);
    //     this.userRoomMap.delete(userIdToRemove);
    //     this.connectionInProgress.delete(userIdToRemove);
    //     this.server.to(roomCode).emit('userLeft', { userId: userIdToRemove });
    //     const count = this.getParticipantCount(roomCode);
    //     this.server.to(roomCode).emit('participantCount', { count });
    //   }
    // }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    if (this.connectionInProgress.get(userId)) {
      return;
    }

    try {
      this.connectionInProgress.set(userId, true);

      // Check existing connection
      const currentSocketId = this.userSocketMap.get(userId);
      if (currentSocketId && currentSocketId !== client.id) {
        const existingSocket = this.server.sockets.sockets.get(currentSocketId);
        if (existingSocket) {
          existingSocket.disconnect(true);
        }
      }

      const { code } = await this.roomsService.createRoom(userId);

      const gameState = await this.gameService.initializeGameState(
        code,
        userId,
      );
      // Update maps
      this.userSocketMap.set(userId, client.id);
      this.userRoomMap.set(userId, code);

      await client.join(code);
      this.server.to(code).emit('userJoined', { userId });
      this.server.to(code).emit('gameStateUpdate', gameState);
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      client.emit('createRoomResponse', { success: true, code });
      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.error(`Error creating room: ${error.message}`);
      client.emit('createRoomResponse', {
        success: false,
        message: error.message,
      });
    } finally {
      this.connectionInProgress.delete(userId);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { userId: number; code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, code } = data;

    if (this.connectionInProgress.get(userId)) {
      return;
    }

    try {
      this.connectionInProgress.set(userId, true);

      // Check if already in the same room
      const currentSocketId = this.userSocketMap.get(userId);
      const currentRoomCode = this.userRoomMap.get(userId);

      if (currentRoomCode === code && currentSocketId === client.id) {
        return;
      }

      // Handle existing connection
      if (currentSocketId && currentSocketId !== client.id) {
        const existingSocket = this.server.sockets.sockets.get(currentSocketId);
        if (existingSocket) {
          existingSocket.disconnect(true);
        }
      }

      const room = await this.roomsService.joinRoom(userId, code);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const gameState = await this.gameService.getGameState(code);

      this.userSocketMap.set(userId, client.id);
      this.userRoomMap.set(userId, code);

      await client.join(code);
      this.server.to(code).emit('userJoined', { userId });
      this.server
        .to(code)
        .emit('gameStateUpdate', { success: true, gameState });
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('joinRoomResponse', {
        success: false,
        message: error.message,
      });
    } finally {
      this.connectionInProgress.delete(userId);
    }
  }

  @SubscribeMessage('getGameState')
  async handleGetGameState(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('gameStateUpdate', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    try {
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
    } catch (error) {
      client.emit('gameStateUpdate', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('addGift')
  async handleAddGift(
    @MessageBody() data: { userId: number; giftName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, giftName } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('addGiftResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    try {
      await this.gameService.addGift(userId, roomCode, giftName);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
      client.emit('addGiftResponse', { success: true });
    } catch (error) {
      client.emit('addGiftResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('checkIn')
  async handleCheckIn(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('checkInResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    try {
      await this.gameService.checkIn(userId, roomCode);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
      client.emit('checkInResponse', { success: true });
    } catch (error) {
      client.emit('checkInResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('startChecking')
  async handleStartChecking(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('startCheckingResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    try {
      await this.gameService.startChecking(userId, roomCode);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
    } catch (error) {
      client.emit('startCheckingResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    @MessageBody()
    data: { userId: number; maxStealPerUser: number; maxStealPerGame: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, maxStealPerGame, maxStealPerUser } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('startGameResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    try {
      await this.gameService.startGame(
        userId,
        roomCode,
        maxStealPerUser,
        maxStealPerGame,
      );
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
    } catch (error) {
      client.emit('startGameResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  private getParticipantCount(code: string): number {
    const room = this.server.sockets.adapter.rooms.get(code);
    return room ? room.size : 0;
  }

  @SubscribeMessage('pickGift')
  async handlePickGift(
    @MessageBody() data: { userId: number; giftId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, giftId } = data;
    const roomCode = this.userRoomMap.get(userId);
    if (!roomCode) {
      client.emit('pickGiftResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }
    try {
      await this.gameService.pickGift(userId, roomCode, giftId);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
      client.emit('pickGiftResponse', { success: true });
    } catch (error) {
      client.emit('pickGiftResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('stealGift')
  async handleStealGift(
    @MessageBody() data: { userId: number; giftId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, giftId } = data;
    const roomCode = this.userRoomMap.get(userId);
    if (!roomCode) {
      client.emit('stealGiftResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }
    try {
      await this.gameService.stealGift(userId, roomCode, giftId);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server
        .to(roomCode)
        .emit('gameStateUpdate', { success: true, gameState });
      client.emit('stealGiftResponse', { success: true });
    } catch (error) {
      client.emit('stealGiftResponse', {
        success: false,
        message: error.message,
      });
    }
  }
}
