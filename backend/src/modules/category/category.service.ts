import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';

export const FALLBACK_CATEGORY_SLUG = 'autres';

export interface CreateCategoryDto {
  name: string;
}

export interface UpdateCategoryDto {
  name?: string;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  /** Catégories visibles par une pharmacie : système (partagées) + les siennes. */
  async findAllForPharmacy(pharmacyId: string) {
    return prisma.category.findMany({
      where: { OR: [{ pharmacy_id: null }, { pharmacy_id: pharmacyId }] },
      orderBy: [{ is_system: 'desc' }, { name: 'asc' }],
    });
  }

  async create(pharmacyId: string, dto: CreateCategoryDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    const slug = slugify(name);
    if (!slug) throw new BadRequestException('name is invalid');

    // Unicité dans la portée visible (système + propre à la pharmacie).
    const clash = await prisma.category.findFirst({
      where: {
        slug,
        OR: [{ pharmacy_id: null }, { pharmacy_id: pharmacyId }],
      },
    });
    if (clash) {
      throw new BadRequestException('A category with this name already exists');
    }

    const category = await prisma.category.create({
      data: { pharmacy_id: pharmacyId, name, slug, is_system: false },
    });
    this.logger.log(`[${pharmacyId}] Category created: ${name} (${slug})`);
    return category;
  }

  async update(pharmacyId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwned(pharmacyId, id);

    const data: { name?: string; slug?: string } = {};
    if (dto.name != null) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name is required');
      const slug = slugify(name);
      if (!slug) throw new BadRequestException('name is invalid');

      const clash = await prisma.category.findFirst({
        where: {
          slug,
          category_id: { not: id },
          OR: [{ pharmacy_id: null }, { pharmacy_id: pharmacyId }],
        },
      });
      if (clash) {
        throw new BadRequestException(
          'A category with this name already exists'
        );
      }
      data.name = name;
      data.slug = slug;
    }

    this.logger.log(`[${pharmacyId}] Category ${id} updated`);
    return prisma.category.update({
      where: { category_id: category.category_id },
      data,
    });
  }

  async remove(pharmacyId: string, id: string) {
    const category = await this.findOwned(pharmacyId, id);
    this.logger.log(`[${pharmacyId}] Category ${id} deleted`);
    await prisma.category.delete({
      where: { category_id: category.category_id },
    });
    return { deleted: true };
  }

  /** Repli automatique : id de la catégorie système "Autres". */
  async getFallbackCategoryId(): Promise<string> {
    const fallback = await prisma.category.findFirst({
      where: { pharmacy_id: null, slug: FALLBACK_CATEGORY_SLUG },
      select: { category_id: true },
    });
    if (!fallback) {
      throw new NotFoundException(
        'Default "Autres" category is missing — run the seed'
      );
    }
    return fallback.category_id;
  }

  /** Valide que des ids de catégories sont visibles par la pharmacie. */
  async assertVisibleIds(pharmacyId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const unique = [...new Set(ids)];
    const found = await prisma.category.count({
      where: {
        category_id: { in: unique },
        OR: [{ pharmacy_id: null }, { pharmacy_id: pharmacyId }],
      },
    });
    if (found !== unique.length) {
      throw new BadRequestException(
        'One or more categories are unknown or not accessible'
      );
    }
  }

  private async findOwned(pharmacyId: string, id: string) {
    const category = await prisma.category.findUnique({
      where: { category_id: id },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.is_system || category.pharmacy_id == null) {
      throw new ForbiddenException('System categories cannot be modified');
    }
    if (category.pharmacy_id !== pharmacyId) {
      throw new ForbiddenException('Not your category');
    }
    return category;
  }
}
