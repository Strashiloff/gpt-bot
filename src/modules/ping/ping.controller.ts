import { HttpService } from '@nestjs/axios';
import { Controller, Get, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Controller('ping')
export class PingController {
  readonly logger = new Logger(PingController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pingHost() {
    const host = this.configService.get('BOT_HOST');

    const responce = await firstValueFrom(this.httpService.get(`${host}/ping`));

    this.logger.log(`Ping success. Response: ${responce.data}`);
  }

  @Get()
  async ping() {
    return 'Hello Ed and Zayka';
  }
}
