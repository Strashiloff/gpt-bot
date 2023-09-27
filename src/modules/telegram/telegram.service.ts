import {
  Ctx,
  InjectBot,
  Mention,
  Message,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { GptService } from '../gpt/gpt.service';
import { Context, Telegraf } from 'telegraf';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  TELEGRAM_GREETING_TEXT,
  TELEGRAM_ERROR_TEXT,
  TELEGRAM_MESSAGE_MAX_SIZE,
} from './telegram.consts';

@Update()
export class TelegramService implements OnApplicationShutdown {
  readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
    private readonly gptService: GptService,
  ) {}

  @Start()
  async greeting(@Ctx() context: Context) {
    await context.reply(TELEGRAM_GREETING_TEXT, {
      parse_mode: 'Markdown',
    });
  }

  @Mention(['BTPMAlphaBot', 'boston_tea_party_gpt_bot'])
  async omMention(@Message('text') message: string, @Ctx() context: Context) {
    if (context.chat.type !== 'private') {
      return this.processMessage(message, context);
    }
  }

  @On(['message'])
  async onMessage(@Message('text') message: string, @Ctx() context: Context) {
    const reply: Context['message'] | undefined =
      context.message['reply_to_message'];

    if (reply) {
      if (
        ['boston_tea_party_gpt_bot', 'BTPMAlphaBot'].includes(
          reply.from.username,
        )
      ) {
        return this.processMessage([message, reply['text']], context);
      }
    }

    if (context.chat.type === 'private') {
      return this.processMessage(message, context);
    }
  }

  onApplicationShutdown(signal?: string) {
    this.bot.stop(`Terminated by signal ${signal}`);
  }

  private async processMessage(message: string | string[], context: Context) {
    await context.sendChatAction('typing');

    try {
      await this.generateResponse(message, context);
    } catch (e) {
      this.logger.error(e.message ?? e, e.stack, e.context);
      await context.reply(TELEGRAM_ERROR_TEXT, {
        reply_to_message_id: context.message.message_id,
      });
    }
  }

  private async generateResponse(message: string | string[], context: Context) {
    const response = await this.gptService.sendMessage(message);
    const responseText = response.join('\n');

    await context.sendChatAction('typing');

    if (responseText.length <= TELEGRAM_MESSAGE_MAX_SIZE) {
      return context.reply(responseText, {
        parse_mode: 'Markdown',
        reply_to_message_id: context.message.message_id,
      });
    }

    const messages = this.splitLongMessage(responseText);

    if (messages.length) {
      messages.forEach(async (m) => {
        await context.reply(m, {
          parse_mode: 'Markdown',
          reply_to_message_id: context.message.message_id,
        });
      });
    }
  }

  private splitLongMessage(message: string): string[] {
    const splitRegex = new RegExp(
      `(?<=\\n|^).{1,${TELEGRAM_MESSAGE_MAX_SIZE}}(?=\\n|$|\\b)`,
      'gs',
    );

    return message.match(splitRegex);
  }
}
