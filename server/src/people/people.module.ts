import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { StudentsController } from './students.controller';
import { TeachersController } from './teachers.controller';
import { StudentsService } from './students.service';
import { TeachersService } from './teachers.service';

@Module({
  imports: [UsersModule],
  controllers: [StudentsController, TeachersController],
  providers: [StudentsService, TeachersService],
  exports: [StudentsService, TeachersService],
})
export class PeopleModule {}
