import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { GptModule } from '../gpt/gpt.module';

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
  providers: [TelegramService],
})
export class TelegramModule {}
