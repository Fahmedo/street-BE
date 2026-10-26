// src/config/email/email.module.ts
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * EmailModule is marked @Global so EmailService can be injected
 * anywhere without importing EmailModule repeatedly in each feature module.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}