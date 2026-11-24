import { Module } from '@nestjs/common';
import { LandingRequestsController } from './landing-requests.controller';
import { LandingRequestsService } from './landing-requests.service';

@Module({
  controllers: [LandingRequestsController],
  providers: [LandingRequestsService],
})
export class LandingRequestsModule {}
