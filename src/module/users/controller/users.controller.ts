import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from '../service/users.service';
import { UserEntity } from '../entities/user.entity';
import { AddUserDto } from '../dto/add-user.dto';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('add-user')
  @HttpCode(HttpStatus.CREATED)
  async addUser(
    @Body() body: AddUserDto
    ): Promise<UserEntity | Error> {
      try{
    return this.usersService.addUser(body);
      }
      catch (error) {
        //todo: log error using sentry in future
        console.log(error);
      }
  }
}
