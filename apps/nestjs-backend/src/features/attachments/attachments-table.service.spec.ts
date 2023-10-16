import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma } from '@teable-group/db-main-prisma';
import { PrismaService } from '@teable-group/db-main-prisma';
import { ClsService } from 'nestjs-cls';
import { AttachmentsTableService } from './attachments-table.service';

describe('AttachmentsService', () => {
  let service: AttachmentsTableService;
  let prismaService: Prisma.TransactionClient;
  const updateManyError = 'updateMany error';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsTableService,
        {
          provide: PrismaService,
          useValue: {
            txClient: function () {
              return this;
            },
            attachmentsTable: {
              findMany: jest.fn(),
              create: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    })
      .useMocker((token) => {
        if (token === ClsService) {
          return {
            get: jest.fn(),
          };
        }
      })
      .compile();

    service = module.get<AttachmentsTableService>(AttachmentsTableService);
    prismaService = module.get<PrismaService>(PrismaService).txClient();
  });

  describe('updateByRecord', () => {
    const tableId = 'tableId';
    const recordId = 'recordId';
    const attachments = [
      {
        tableId,
        recordId,
        attachmentId: 'attachmentId1',
        token: 'token',
        name: 'name',
        fieldId: 'fieldId',
      },
    ];

    it('should update by record if no existing records', async () => {
      (prismaService.attachmentsTable.findMany as jest.Mock).mockResolvedValueOnce([]);
      await service.updateByRecords(attachments);
      expect(prismaService.attachmentsTable.create).toHaveBeenCalledTimes(attachments.length);
      expect(prismaService.attachmentsTable.deleteMany).not.toBeCalled();
    });

    it('should create new and delete old records if there are existing records', async () => {
      const exists = [
        {
          attachmentId: 'attachmentId2',
          tableId,
          recordId,
          fieldId: 'fieldId',
        },
      ];
      (prismaService.attachmentsTable.findMany as jest.Mock).mockResolvedValueOnce(exists);
      await service.updateByRecords(attachments);
      expect(prismaService.attachmentsTable.create).toHaveBeenCalledTimes(attachments.length);
      expect(prismaService.attachmentsTable.deleteMany).toBeCalledTimes(exists.length);
    });

    it('should throw error if findMany fails', async () => {
      (prismaService.attachmentsTable.findMany as jest.Mock).mockRejectedValueOnce(
        new Error('findMany error')
      );
      await expect(service.updateByRecords(attachments)).rejects.toThrow('findMany error');
      expect(prismaService.attachmentsTable.create).not.toBeCalled();
      expect(prismaService.attachmentsTable.deleteMany).not.toBeCalled();
    });

    it('should throw error if create fails', async () => {
      (prismaService.attachmentsTable.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.attachmentsTable.create as jest.Mock).mockRejectedValueOnce(
        new Error('create error')
      );
      await expect(service.updateByRecords(attachments)).rejects.toThrow('create error');
      expect(prismaService.attachmentsTable.create).toBeCalled();
      expect(prismaService.attachmentsTable.deleteMany).not.toBeCalled();
    });

    it('should throw error if updateMany fails', async () => {
      const exists = [
        {
          attachmentId: 'attachmentId2',
          tableId,
          recordId,
          fieldId: 'fieldId',
        },
      ];
      (prismaService.attachmentsTable.findMany as jest.Mock).mockResolvedValueOnce(exists);
      (prismaService.attachmentsTable.deleteMany as jest.Mock).mockRejectedValueOnce(
        new Error(updateManyError)
      );
      await expect(service.updateByRecords(attachments)).rejects.toThrow(updateManyError);
      expect(prismaService.attachmentsTable.create).toBeCalled();
      expect(prismaService.attachmentsTable.deleteMany).toBeCalled();
    });
  });

  describe('delete', () => {
    const queries = ['attachmentId'];

    it('should delete records', async () => {
      await service.delete(queries);
      expect(prismaService.attachmentsTable.deleteMany).toBeCalledTimes(queries.length);
    });

    it('should throw error if updateMany fails', async () => {
      (prismaService.attachmentsTable.deleteMany as jest.Mock).mockRejectedValueOnce(
        new Error(updateManyError)
      );
      await expect(service.delete(queries)).rejects.toThrow(updateManyError);
      expect(prismaService.attachmentsTable.deleteMany).toBeCalled();
    });
  });

  describe('deleteFields', () => {
    it('should do nothing if fieldIds array is empty', async () => {
      const tableId = 'table1';
      const fieldIds: string[] = [];

      await service.deleteFields(tableId, fieldIds);
    });

    it('should delete attachments with fieldIds', async () => {
      const tableId = 'table1';
      const fieldIds = ['field1', 'field2'];

      await service.deleteFields(tableId, fieldIds);
      expect(prismaService.attachmentsTable.deleteMany).toBeCalledWith({
        where: { tableId, fieldId: { in: fieldIds } },
      });
    });
  });

  describe('deleteTable', () => {
    it('should delete attachments with tableId', async () => {
      const tableId = 'table1';

      await service.deleteTable(tableId);

      expect(prismaService.attachmentsTable.deleteMany).toBeCalledWith({
        where: { tableId },
      });
    });
  });

  describe('deleteRecords', () => {
    it('should do nothing if recordIds array is empty', async () => {
      const tableId = 'table1';
      const recordIds: string[] = [];

      await service.deleteRecords(tableId, recordIds);
    });

    it('should delete attachments with recordIds', async () => {
      const tableId = 'table1';
      const recordIds = ['record1', 'record2'];

      await service.deleteRecords(tableId, recordIds);
      expect(prismaService.attachmentsTable.deleteMany).toBeCalledWith({
        where: { tableId, recordId: { in: recordIds } },
      });
    });
  });
});
