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

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

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
      console.log(`Room creation already in progress for user ${userId}`);
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
      console.log(`User ${userId} created and joined room ${code}`);

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
      console.log(`Join already in progress for user ${userId}`);
      return;
    }

    try {
      this.connectionInProgress.set(userId, true);

      // Check if already in the same room
      const currentSocketId = this.userSocketMap.get(userId);
      const currentRoomCode = this.userRoomMap.get(userId);

      if (currentRoomCode === code && currentSocketId === client.id) {
        console.log(`User ${userId} is already in room ${code}`);
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
      console.log(`User ${userId} joined room ${code}`);

      this.server.to(code).emit('userJoined', { userId });
      this.server.to(code).emit('gameStateUpdate', { success: true, gameState });
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.log(error.stack)
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
      this.server.to(roomCode).emit('gameStateUpdate', { success: true, gameState });
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
      this.server.to(roomCode).emit('gameStateUpdate', { success: true, gameState });
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
      this.server.to(roomCode).emit('gameStateUpdate', { success: true, gameState });
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
      console.log("gameState after checkin", gameState)
      this.server.to(roomCode).emit('gameStateUpdate', { success: true, gameState });
    } catch (error) {
      client.emit('startCheckingResponse', {
        success: false,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const roomCode = this.userRoomMap.get(userId);

    if (!roomCode) {
      client.emit('startGameResponse', {
        success: false,
        message: 'User not in room',
      });
      return;
    }

    console.log("game is started lets go")
    return

    try {
      // await this.gameService.startGame(userId, roomCode);
      const gameState = await this.gameService.getGameState(roomCode);
      this.server.to(roomCode).emit('gameStateUpdate', { success: true, gameState });
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
}
