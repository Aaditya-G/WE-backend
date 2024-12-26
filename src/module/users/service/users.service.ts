import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity';
import { AddUserDto } from '../dto/add-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async addUser(body: AddUserDto): Promise<UserEntity | Error> {
    const existingUser = await this.userRepository.findOne({ 
        where: {
            name : body.name
        } });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
    const user = new UserEntity();
    user.name = body.name;
    this.userRepository.create( user);
    return this.userRepository.save(user);
  }
}