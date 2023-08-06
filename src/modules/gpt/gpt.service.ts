import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatCompletionRequestMessage, OpenAIApi } from 'openai';
import { GPT_INSTANCE } from './gpt.consts';
import { catchError, firstValueFrom, from, map, of } from 'rxjs';

@Injectable()
export class GptService {
  private readonly logger = new Logger(GptService.name);

  constructor(@Inject(GPT_INSTANCE) readonly instance: OpenAIApi) {}

  async sendMessage(
    contents: string[] | string,
    options?: Omit<ChatCompletionRequestMessage, 'content'>,
  ) {
    return firstValueFrom(
      from(
        this.instance.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: (Array.isArray(contents) ? contents : [contents]).map(
            (content) => ({ content, role: 'user', ...options }),
          ),
        }),
      ).pipe(
        map((response) =>
          response.data.choices.map((choice) => choice?.message?.content ?? ''),
        ),
        catchError((err) => {
          this.logger.error(err);

          return of(['Ошибка, попробуйте задать свой вопрос позже :(']);
        }),
      ),
    );
  }
}
