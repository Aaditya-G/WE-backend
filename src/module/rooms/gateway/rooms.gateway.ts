// rooms.gateway.ts
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

  constructor(private readonly roomsService: RoomsService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Find and cleanup user associated with this socket
    let userIdToRemove: number | undefined;
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        userIdToRemove = userId;
        break;
      }
    }

    if (userIdToRemove) {
      const roomCode = this.userRoomMap.get(userIdToRemove);
      if (roomCode) {
        await this.roomsService.leaveRoom(userIdToRemove, roomCode);
        this.userSocketMap.delete(userIdToRemove);
        this.userRoomMap.delete(userIdToRemove);
        this.connectionInProgress.delete(userIdToRemove);
        
        this.server.to(roomCode).emit('userLeft', { userId: userIdToRemove });
        const count = this.getParticipantCount(roomCode);
        this.server.to(roomCode).emit('participantCount', { count });
      }
    }
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
      
      // Update maps
      this.userSocketMap.set(userId, client.id);
      this.userRoomMap.set(userId, code);

      await client.join(code);
      console.log(`User ${userId} created and joined room ${code}`);
      
      this.server.to(code).emit('userJoined', { userId });
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      client.emit('createRoomResponse', { success: true, code });
      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.error(`Error creating room: ${error.message}`);
      client.emit('createRoomResponse', { 
        success: false, 
        message: error.message 
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

      this.userSocketMap.set(userId, client.id);
      this.userRoomMap.set(userId, code);

      await client.join(code);
      console.log(`User ${userId} joined room ${code}`);
      
      this.server.to(code).emit('userJoined', { userId });
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('joinRoomResponse', { 
        success: false, 
        message: error.message 
      });
    } finally {
      this.connectionInProgress.delete(userId);
    }
  }

  private getParticipantCount(code: string): number {
    const room = this.server.sockets.adapter.rooms.get(code);
    return room ? room.size : 0;
  }
}