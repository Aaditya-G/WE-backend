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
    origin: '*', // For demo purposes; restrict in production
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap: Map<number, string> = new Map();

  constructor(private readonly roomsService: RoomsService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Optionally, authenticate the client here
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Find the userId associated with this socket
    let userIdToRemove: number | undefined;
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        userIdToRemove = userId;
        this.userSocketMap.delete(userId);
        break;
      }
    }

    if (userIdToRemove) {
      // Find rooms the socket was part of
      const rooms = Array.from(client.rooms).filter((room) => room !== client.id);

      for (const room of rooms) {
        // Notify others in the room about the disconnection
        this.server.to(room).emit('userLeft', { userId: userIdToRemove, socketId: client.id });

        // Recalculate participant count
        const count = this.getParticipantCount(room);
        this.server.to(room).emit('participantCount', { count });
      }
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { userId: number; code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, code } = data;
    try {
      // Check if the user is already connected with a different socket
      const existingSocketId = this.userSocketMap.get(userId);
      if (existingSocketId && existingSocketId !== client.id) {
        // Disconnect the old socket
        const existingSocket = this.server.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit('forceDisconnect', 'You have been disconnected because you joined from another device.');
          existingSocket.disconnect(true);
          console.log(`Disconnected existing socket ${existingSocketId} for user ${userId}`);
        }
      }

      // Update the userSocketMap
      this.userSocketMap.set(userId, client.id);

      // Validate the room and user
      const room = await this.roomsService.joinRoom(userId, code);
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      // Add the client to the Socket.io room
      client.join(code);
      console.log(`User ${userId} joined room ${code}`);

      // Notify all participants in the room
      this.server.to(code).emit('userJoined', { userId, socketId: client.id });

      // Get participant count
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

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
      // Check if the user is already connected with a different socket
      const existingSocketId = this.userSocketMap.get(userId);
      if (existingSocketId && existingSocketId !== client.id) {
        // Disconnect the old socket
        const existingSocket = this.server.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit('forceDisconnect', 'You have been disconnected because you created a room from another device.');
          existingSocket.disconnect(true);
          console.log(`Disconnected existing socket ${existingSocketId} for user ${userId}`);
        }
      }

      // Update the userSocketMap
      this.userSocketMap.set(userId, client.id);

      // Create the room
      const { code } = await this.roomsService.createRoom(userId);
      if (!code) {
        throw new Error('Failed to create room');
      }

      // Add the client to the room
      client.join(code);
      console.log(`User ${userId} created and joined room ${code}`);

      // Notify all participants in the room
      this.server.to(code).emit('userJoined', { userId, socketId: client.id });

      // Get participant count
      const count = this.getParticipantCount(code);
      this.server.to(code).emit('participantCount', { count });

      // Emit a response back to the client
      client.emit('createRoomResponse', { success: true, code });
    } catch (error) {
      console.error(`Error creating room: ${error.message}`);
      client.emit('createRoomResponse', { success: false, message: error.message });
    }
  }

  // Additional event handlers (e.g., startGame, leaveRoom)

  private getParticipantCount(code: string): number {
    const room = this.server.sockets.adapter.rooms.get(code);
    return room ? room.size : 0;
  }
}
