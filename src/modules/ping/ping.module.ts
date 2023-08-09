import { Module } from '@nestjs/common';
import { PingController } from './ping.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [PingController],
})
export class PingModule {}
