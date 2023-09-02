import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from '../telegram/telegram.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PingModule } from '../ping/ping.module';
import { HealthModule } from '../health/health.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegramModule,
    ScheduleModule.forRoot(),
    PingModule,
    HealthModule,
  ],
})
export class AppModule {}
