import { Ctx, InjectBot, Mention, Message, On, Update } from 'nestjs-telegraf';
import { GptService } from '../gpt/gpt.service';
import { Context, Telegraf } from 'telegraf';
import { OnApplicationShutdown } from '@nestjs/common';

@Update()
export class TelegramService implements OnApplicationShutdown {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
    private readonly gptService: GptService,
  ) {}

  @Mention('BTPMAlphaBot')
  async omMention(@Message('text') message: string, @Ctx() context: Context) {
    if (context.chat.type === 'private') {
      return;
    }

    const post = await this.sendProcessStatus(context);
    const messages = await this.gptService.sendMessage(message);

    this.editMessageText({
      chatId: post.chat.id,
      messageId: post.message_id,
      message: messages.join(),
    });
  }

  @On(['message'])
  async onMessage(@Message('text') message: string, @Ctx() context: Context) {
    const reply: Context['message'] | undefined =
      context.message['reply_to_message'];

    if (reply) {
      if (reply.from.username === 'BTPMAlphaBot') {
        const post = await this.sendProcessStatus(context, true);
        const response = await this.gptService.sendMessage([
          reply['text'] as string,
          message,
        ]);

        this.editMessageText({
          chatId: post.chat.id,
          messageId: post.message_id,
          message: response.join(),
        });

        return;
      }
    }

    if (context.chat.type === 'private') {
      const post = await this.sendProcessStatus(context, true);
      const response = await this.gptService.sendMessage(message);

      this.editMessageText({
        chatId: post.chat.id,
        messageId: post.message_id,
        message: response.join(),
      });

      return;
    }
  }

  onApplicationShutdown(signal?: string) {
    this.bot.stop(`Terminated by signal ${signal}`);
  }

  private editMessageText({
    chatId,
    messageId,
    message,
  }: {
    chatId: string | number;
    messageId: number;
    message: string;
  }) {
    this.bot.telegram.editMessageText(chatId, messageId, null, message, {
      parse_mode: 'Markdown',
    });
  }

  private async sendProcessStatus(context: Context, reply = false) {
    return context.reply('Ожидайте, я уже думаю...', {
      reply_to_message_id: reply ? context.message.message_id : undefined,
    });
  }
}
