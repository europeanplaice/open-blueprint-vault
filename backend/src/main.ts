import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Allow access from frontend (Next.js)
  app.enableCors();
  
  // Start on port 3001
  await app.listen(3001);
  console.log(`Application is running on: http://localhost:3001`);
}
bootstrap();
