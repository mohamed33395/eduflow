import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { PaymentChannelsService } from './payment-channels.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [FinanceController],
  providers: [PaymentsService, PayoutsService, PaymentChannelsService],
  exports: [PaymentsService, PayoutsService, PaymentChannelsService],
})
export class FinanceModule {}
