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
      // Handle any initialization if necessary
    }
  
    async handleDisconnect(client: Socket) {
      console.log(`Client disconnected: ${client.id}`);
      // Handle user disconnection logic
    }
  
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
      @MessageBody() data: { userId: number; code: string },
      @ConnectedSocket() client: Socket,
    ) {
      const { userId, code } = data;
      try {
        const room = await this.roomsService.joinRoom(userId, code);
        client.join(code);
        this.server.to(code).emit('userJoined', { userId });
      } catch (error) {
        client.emit('error', error.message);
      }
    }
  
    @SubscribeMessage('createRoom')
    async handleCreateRoom(@MessageBody() data: { userId: number }, @ConnectedSocket() client: Socket) {
      const { userId } = data;
      try {
        const { code } = await this.roomsService.createRoom(userId);
        client.join(code);
        client.emit('roomCreated', { code });
      } catch (error) {
        client.emit('error', error.message);
      }
    }
  
    // Additional event handlers
  }
  