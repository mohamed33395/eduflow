import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy the real client IP arrives in X-Forwarded-For —
  // without this the global ThrottlerGuard sees every request as the proxy's
  // IP and rate-limits all users as one. TRUST_PROXY accepts: a hop count
  // ("1", the default), "false" to disable, or an IP/CIDR list.
  const trustProxy = process.env.TRUST_PROXY ?? '1';
  if (trustProxy !== 'false' && trustProxy !== '0') {
    const numeric = Number(trustProxy);
    app.set('trust proxy', Number.isNaN(numeric) ? trustProxy : numeric);
  }

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    // The browser PUTs uploads directly to /uploads/local — include every dev
    // frontend port (3000 is next dev's default, 3002 this app's).
    origin: (
      process.env.CORS_ORIGIN ??
      'http://localhost:3000,http://localhost:3002'
    ).split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`EduFlow API listening on http://localhost:${port}/api`);
}

bootstrap();
