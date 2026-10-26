import { Test, TestingModule } from '@nestjs/testing';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceService } from './student-attendance.service';

describe('StudentAttendanceController', () => {
  let controller: StudentAttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentAttendanceController],
      providers: [StudentAttendanceService],
    }).compile();

    controller = module.get<StudentAttendanceController>(StudentAttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
