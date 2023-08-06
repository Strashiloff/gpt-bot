import { Module } from '@nestjs/common';

import {
  ConfigurableGptModuleClass,
  GPT_CONFIG_OPTIONS,
  GPT_INSTANCE,
} from './gpt.consts';
import { GptService } from './gpt.service';
import { Configuration, ConfigurationParameters, OpenAIApi } from 'openai';

@Module({
  providers: [
    {
      provide: GPT_INSTANCE,
      useFactory: (options: ConfigurationParameters) => {
        const confugutation = new Configuration(options);

        return new OpenAIApi(confugutation);
      },
      inject: [GPT_CONFIG_OPTIONS],
    },
    GptService,
  ],
  exports: [GptService],
})
export class GptModule extends ConfigurableGptModuleClass {}
