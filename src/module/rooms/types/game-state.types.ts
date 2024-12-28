import { UserEntity } from "src/module/users/entities/user.entity";
import { GameStatus } from "../enums";
import { LogEntity } from "../entities/log.entity";

export interface GameStateUser {
    name : string;
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
    stolenCount: number;
  }
  
  export interface GameState {
    status: GameStatus;
    owner: UserEntity;
    users: GameStateUser[];
    gifts: GameStateGift[];
    currentTurn: number | null;
    totalStealsSoFar: number;
    maxStealPerUser: number;
    maxStealPerGame: number;
    maxStealPerGift: number;
    turnOrder: number[];
    logs : LogEntity[];
  }