import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './modules/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  process.on('SIGTERM', async () => {
    await app.close();

    process.exit(0);
  });

  await app.listen(3000, '0.0.0.0');
}

bootstrap();
