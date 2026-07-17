import { Injectable } from '@nestjs/common';

import { prisma } from '../../database/client';
import { CreateDemoRequestDto, CreateWaitlistEntryDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  async createDemoRequest(dto: CreateDemoRequestDto) {
    return prisma.demoRequest.create({
      data: { ...dto, pharmacy_count: dto.pharmacy_count ?? 1 },
    });
  }

  async createWaitlistEntry(dto: CreateWaitlistEntryDto) {
    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: dto.email },
    });
    if (existing) return existing; // idempotent — pas d'erreur si l'email existe déjà
    return prisma.waitlistEntry.create({ data: dto });
  }

  async findDemoRequests(page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      prisma.demoRequest.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demoRequest.count(),
    ]);
    return { data, total, page, limit };
  }

  async markContacted(id: string) {
    return prisma.demoRequest.update({
      where: { id },
      data: { contacted_at: new Date() },
    });
  }

  async findWaitlistEntries(page = 1, limit = 100) {
    const [data, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.waitlistEntry.count(),
    ]);
    return { data, total, page, limit };
  }
}
