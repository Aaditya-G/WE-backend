//add user dto

import { IsString } from 'class-validator';

export class AddUserDto {
  @IsString()
  name: string;
}