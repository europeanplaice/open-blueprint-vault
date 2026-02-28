import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrawingsModule } from './drawings.module';

@Module({
  imports: [DrawingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
