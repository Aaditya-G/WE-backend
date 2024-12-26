import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './module/users/users.module';
import { RoomsModule } from './module/rooms/rooms.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config, { DatabaseConfig } from './config/configuration';
import { ConfigKeyModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        const nodeEnv = configService.get<string>('ENVIRONMENT') || 'development';
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: nodeEnv !== 'production',
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    RoomsModule,
    ConfigKeyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
