import { Injectable } from '@nestjs/common';
import { PrismaService } from '@teable-group/db-main-prisma';
import type { Prisma } from '@teable-group/db-main-prisma';
import { difference, keyBy, map } from 'lodash';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';

@Injectable()
export class AttachmentsTableService {
  constructor(
    private readonly cls: ClsService<IClsStore>,
    private readonly prismaService: PrismaService
  ) {}

  async updateByRecords(
    attachments: {
      tableId: string;
      recordId: string;
      fieldId: string;
      attachmentId: string;
      token: string;
      name: string;
    }[]
  ) {
    const userId = this.cls.get('user.id');

    const existAttachments = await this.prismaService.txClient().attachmentsTable.findMany({
      where: {
        attachmentId: {
          in: map(attachments, 'attachmentId'),
        },
      },
      select: {
        attachmentId: true,
        tableId: true,
        recordId: true,
        fieldId: true,
      },
    });

    const existAttachmentsMap = keyBy(existAttachments, 'attachmentId');

    const attachmentsMap = attachments.reduce((map, attachment) => {
      const { attachmentId } = attachment;
      map[attachmentId] = {
        ...attachment,
        createdBy: userId,
      };
      return map;
    }, {} as Record<string, Prisma.AttachmentsTableCreateInput>);

    const existsKeys = Object.keys(existAttachmentsMap);
    const attachmentsKeys = Object.keys(attachmentsMap);

    const needDeleteKey = difference(existsKeys, attachmentsKeys);
    const needCreateKey = difference(attachmentsKeys, existsKeys);

    for (let i = 0; i < needCreateKey.length; i++) {
      await this.prismaService.txClient().attachmentsTable.create({
        data: attachmentsMap[needCreateKey[i]],
      });
    }

    await this.delete(needDeleteKey);
  }

  async delete(attachmentIds: string[]) {
    if (!attachmentIds.length) {
      return;
    }

    await this.prismaService.txClient().attachmentsTable.deleteMany({
      where: { attachmentId: { in: attachmentIds } },
    });
  }

  async deleteFields(tableId: string, fieldIds: string[]) {
    if (fieldIds.length === 0) {
      return;
    }
    await this.prismaService.txClient().attachmentsTable.deleteMany({
      where: { tableId, fieldId: { in: fieldIds } },
    });
  }

  async deleteTable(tableId: string) {
    await this.prismaService.txClient().attachmentsTable.deleteMany({
      where: { tableId },
    });
  }

  async deleteRecords(tableId: string, recordIds: string[]) {
    if (recordIds.length === 0) {
      return;
    }
    await this.prismaService.txClient().attachmentsTable.deleteMany({
      where: { tableId, recordId: { in: recordIds } },
    });
  }
}
