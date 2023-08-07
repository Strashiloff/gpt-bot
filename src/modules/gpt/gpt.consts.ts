import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ConfigurationParameters } from 'openai';

export const GPT_INSTANCE = 'GPT_INSTANCE';

export const {
  ConfigurableModuleClass: ConfigurableGptModuleClass,
  MODULE_OPTIONS_TOKEN: GPT_CONFIG_OPTIONS,
} = new ConfigurableModuleBuilder<ConfigurationParameters>().build();
