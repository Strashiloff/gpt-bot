import {
  Command,
  Ctx,
  InjectBot,
  Message,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { GptService } from '../gpt/gpt.service';
import { Context, Telegraf } from 'telegraf';
import { Inject, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  TELEGRAM_GREETING_TEXT,
  TELEGRAM_ERROR_TEXT,
  TELEGRAM_MESSAGE_MAX_SIZE,
  TELEGRAM_CLEAN_HISTORY,
} from './telegram.consts';
import {
  HISTORY_SERVICE_TOKEN,
  HistoryCreateRecord,
  IHistoryService,
} from './history/IHistoryService';
import { ConfigService } from '@nestjs/config';

@Update()
export class TelegramService implements OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botNames = this.getBotNames();

  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
    private readonly gptService: GptService,
    @Inject(HISTORY_SERVICE_TOKEN)
    private readonly historyService: IHistoryService,
    private readonly configService: ConfigService,
  ) {
    this.watchForBotMention();
  }

  @Start()
  async greeting(@Ctx() context: Context) {
    await context.reply(TELEGRAM_GREETING_TEXT, {
      parse_mode: 'Markdown',
    });
  }

  @Command('clear')
  async clearHistory(@Ctx() context: Context) {
    this.historyService.clear(context.chat.id);

    await this.generateResponse(TELEGRAM_CLEAN_HISTORY, context);
  }

  async onMention(message: string, context: Context) {
    if (context.chat.type !== 'private') {
      return this.processMessage(message, context);
    }
  }

  @On(['message'])
  async onMessage(@Message('text') message: string, @Ctx() context: Context) {
    const reply: Context['message'] | undefined =
      context.message['reply_to_message'];

    if (reply) {
      if (this.botNames.includes(reply.from.username)) {
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

    const messages = Array.isArray(message) ? message : [message];
    const messageRecords: HistoryCreateRecord[] = messages.map((m) => ({
      message: m,
      date: new Date(context.message.date),
    }));
    const chatHistory = this.historyService.add(
      context.chat.id,
      ...messageRecords,
    );

    try {
      const responseMessage = await this.generateResponse(
        chatHistory.map(({ message }) => message),
        context,
      );
      this.historyService.add(context.chat.id, {
        message: responseMessage,
        date: new Date(),
      });
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

    const messages = this.splitLongMessage(responseText);

    messages.forEach(async (m) => {
      await context.reply(m, {
        parse_mode: 'Markdown',
        reply_to_message_id: context.message.message_id,
      });
    });

    return responseText;
  }

  private watchForBotMention() {
    this.bot.mention(this.botNames, (context) =>
      this.onMention(context.update['message']?.text ?? '', context),
    );
  }

  private splitLongMessage(message: string): string[] {
    const splitRegex = new RegExp(
      `(?<=\\n|^).{1,${TELEGRAM_MESSAGE_MAX_SIZE}}(?=\\n|$|\\b)`,
      'gs',
    );

    return message.match(splitRegex);
  }

  private getBotNames(): string[] {
    const botNamesString = this.configService.get<string>('BOT_NAMES');
    const botNames = botNamesString.split(',').map((name) => name.trim());

    return botNames;
  }
}
