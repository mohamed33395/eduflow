import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';

@Module({
  controllers: [FinanceController],
  providers: [PaymentsService, PayoutsService],
  exports: [PaymentsService, PayoutsService],
})
export class FinanceModule {}
