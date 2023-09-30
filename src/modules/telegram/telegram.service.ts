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
import { ChatCompletionRequestMessage } from 'openai';

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
    const history = this.historyService.get(context.chat.id);

    if (!history.length) {
      await context.sendChatAction('typing');
      await context.reply('История пуста');

      return;
    }

    this.historyService.clear(context.chat.id);

    await this.generateResponse(
      {
        content: TELEGRAM_CLEAN_HISTORY,
        role: 'user',
      },
      context,
    );
  }

  async onMention(message: string, context: Context) {
    if (context.chat.type !== 'private') {
      return this.processMessage(
        {
          message,
          role: 'user',
          date: new Date(context.message.date),
        },
        context,
      );
    }
  }

  @On(['message'])
  async onMessage(@Message('text') message: string, @Ctx() context: Context) {
    const reply: Context['message'] | undefined =
      context.message['reply_to_message'];
    const userMessage: HistoryCreateRecord = {
      message,
      role: 'user',
      date: new Date(context.message.date),
    };

    if (reply) {
      if (this.botNames.includes(reply.from.username)) {
        return this.processMessage(
          [
            userMessage,
            {
              message: reply['text'],
              role: 'system',
              date: new Date(reply.date),
            },
          ],
          context,
        );
      }
    }

    if (context.chat.type === 'private') {
      return this.processMessage(userMessage, context);
    }
  }

  onApplicationShutdown(signal?: string) {
    this.bot.stop(`Terminated by signal ${signal}`);
  }

  private async processMessage(
    message: HistoryCreateRecord | HistoryCreateRecord[],
    context: Context,
  ) {
    await context.sendChatAction('typing');

    const messages = Array.isArray(message) ? message : [message];
    const chatHistory = this.historyService.add(context.chat.id, ...messages);

    try {
      const responseMessage = await this.generateResponse(
        chatHistory.map((record) => ({
          content: record.message,
          role: record.role,
        })),
        context,
      );
      this.historyService.add(context.chat.id, {
        message: responseMessage,
        date: new Date(),
        role: 'system',
      });
    } catch (e) {
      this.logger.error(e.message ?? e, e.stack, e.context);
      await context.reply(TELEGRAM_ERROR_TEXT, {
        reply_to_message_id: context.message.message_id,
      });
    }
  }

  private async generateResponse(
    message: ChatCompletionRequestMessage | ChatCompletionRequestMessage[],
    context: Context,
  ) {
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
