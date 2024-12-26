// src/gateway/rooms.gateway.ts
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
import { GameStatus } from '../enums';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Optionally, authenticate the client here
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Handle user disconnection logic, e.g., remove from rooms
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { userId: number; code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, code } = data;
    try {
      // Validate the room and user
      const room = await this.roomsService.joinRoom(userId, code);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      // Add the client to the Socket.io room
      client.join(code);
      console.log(`User ${userId} joined room ${code}`);

      // Notify all participants in the room
      this.server.to(code).emit('userJoined', { userId });

      // Emit a response back to the client
      client.emit('joinRoomResponse', { success: true });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('joinRoomResponse', { success: false, message: error.message });
    }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    try {
      // Create the room
      const { code } = await this.roomsService.createRoom(userId);
      if (!code) {
        throw new Error('Failed to create room');
      }

      // Add the client to the room
      client.join(code);
      console.log(`User ${userId} created and joined room ${code}`);

      // Emit a response back to the client
      client.emit('roomCreated', { code });
    } catch (error) {
      console.error(`Error creating room: ${error.message}`);
      client.emit('error', error.message);
    }
  }

  // Additional event handlers (e.g., startGame, leaveRoom)
}
