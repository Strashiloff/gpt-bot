import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { GptModule } from '../gpt/gpt.module';
import { HistoryService } from './history/history.service';
import { HISTORY_SERVICE_TOKEN } from './history/IHistoryService';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const defaultHandlerTimeout = 5 * 60 * 1000; // 5 minutes
        const handlerTimeout = +config.get(
          'TELEGRAM_HANDLER_TIMEOUT',
          defaultHandlerTimeout,
        );

        return {
          token: config.get('TELEGRAM_BOT_TOKEN'),
          options: {
            handlerTimeout: Number.isNaN(handlerTimeout)
              ? defaultHandlerTimeout
              : handlerTimeout,
          },
        };
      },
      inject: [ConfigService],
    }),
    GptModule.registerAsync({
      useFactory: (config: ConfigService) => {
        return {
          apiKey: config.get('GPT_API_KEY'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    TelegramService,
    {
      provide: HISTORY_SERVICE_TOKEN,
      useClass: HistoryService,
    },
  ],
})
export class TelegramModule {}
