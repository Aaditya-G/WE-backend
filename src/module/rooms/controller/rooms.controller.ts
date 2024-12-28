import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { RoomsService } from '../service/rooms.service';
import { RoomEntity } from '../entities/room.entity';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('create')
  async createRoom(@Body('userId') userId: number): Promise<{ code: string }> {
    const { room, code } = await this.roomsService.createRoom(userId);
    return { code };
  }

  @Post('join')
  async joinRoom(
    @Body('userId') userId: number,
    @Body('code') code: string,
  ): Promise<RoomEntity> {
    return this.roomsService.joinRoom(userId, code);
  }

  @Get(':code')
  async getRoomInfo(@Param('code') code: string) {
    return this.roomsService.getRoomInfo(code);
  }

  // Additional endpoints
}
