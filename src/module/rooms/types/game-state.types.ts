import { UserEntity } from "src/module/users/entities/user.entity";
import { GameStatus } from "../enums";

export interface GameStateUser {
    id: number;
    isCheckedIn: boolean;
    giftId: number | null;
    receivedGiftId: number | null;
  }
  
  export interface GameStateGift {
    id: number;
    name: string;
    addedById: number;
    receivedById: number | null;
  }
  
  export interface GameState {
    status: GameStatus;
    owner: UserEntity;
    users: GameStateUser[];
    gifts: GameStateGift[];
    currentTurn: number | null;
  }