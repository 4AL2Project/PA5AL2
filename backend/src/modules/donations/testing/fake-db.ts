// Faux client Prisma en mémoire pour les tests du cycle don.
// Implémente uniquement les opérateurs utilisés par le module donations
// (equality, in, not, lt/lte/gt/gte, filtre relationnel, increment/decrement,
// includes, groupBy, $transaction avec rollback sur exception).
/* eslint-disable @typescript-eslint/no-explicit-any */

import { randomUUID } from 'node:crypto';

type Row = Record<string, any>;

interface RelationDef {
  model: string;
  // clé locale → clé distante ; single = relation 1-1 (objet, pas tableau)
  localKey: string;
  foreignKey: string;
  single?: boolean;
}

const ID_FIELDS: Record<string, string> = {
  pharmacy: 'pharmacy_id',
  product: 'product_id',
  action: 'action_id',
  association: 'association_id',
  donation: 'donation_id',
  donationLine: 'line_id',
  donationProposal: 'proposal_id',
  donationAllocation: 'allocation_id',
  donationEvent: 'event_id',
  donationEmailLog: 'id',
  donParametres: 'id',
};

const RELATIONS: Record<string, Record<string, RelationDef>> = {
  donation: {
    lines: {
      model: 'donationLine',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
    },
    proposals: {
      model: 'donationProposal',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
    },
    allocations: {
      model: 'donationAllocation',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
    },
    events: {
      model: 'donationEvent',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
    },
    pharmacy: {
      model: 'pharmacy',
      localKey: 'pharmacy_id',
      foreignKey: 'pharmacy_id',
      single: true,
    },
    action: {
      model: 'action',
      localKey: 'action_id',
      foreignKey: 'action_id',
      single: true,
    },
  },
  donationLine: {
    product: {
      model: 'product',
      localKey: 'product_id',
      foreignKey: 'product_id',
      single: true,
    },
    donation: {
      model: 'donation',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
      single: true,
    },
  },
  donationProposal: {
    donation: {
      model: 'donation',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
      single: true,
    },
    association: {
      model: 'association',
      localKey: 'association_id',
      foreignKey: 'association_id',
      single: true,
    },
    allocation: {
      model: 'donationAllocation',
      localKey: 'proposal_id',
      foreignKey: 'proposal_id',
      single: true,
    },
  },
  donationAllocation: {
    donation: {
      model: 'donation',
      localKey: 'donation_id',
      foreignKey: 'donation_id',
      single: true,
    },
    association: {
      model: 'association',
      localKey: 'association_id',
      foreignKey: 'association_id',
      single: true,
    },
    proposal: {
      model: 'donationProposal',
      localKey: 'proposal_id',
      foreignKey: 'proposal_id',
      single: true,
    },
  },
};

// Contraintes d'unicité vérifiées à l'insert (comme en base)
const UNIQUE_SETS: Record<string, string[][]> = {
  donationEmailLog: [
    ['proposal_id', 'email_type'],
    ['allocation_id', 'email_type'],
  ],
};

export interface FakeDb {
  tables: Record<string, Row[]>;
  seed(model: string, row: Row): Row;
  [model: string]: any;
}

function matchesValue(rowValue: any, condition: any): boolean {
  if (
    condition !== null &&
    typeof condition === 'object' &&
    !(condition instanceof Date)
  ) {
    if ('in' in condition) return (condition.in as any[]).includes(rowValue);
    if ('not' in condition) {
      return condition.not === null
        ? rowValue != null
        : rowValue !== condition.not;
    }
    if ('lt' in condition) return rowValue != null && rowValue < condition.lt;
    if ('lte' in condition)
      return rowValue != null && rowValue <= condition.lte;
    if ('gt' in condition) return rowValue != null && rowValue > condition.gt;
    if ('gte' in condition)
      return rowValue != null && rowValue >= condition.gte;
    return false;
  }
  if (rowValue instanceof Date && condition instanceof Date) {
    return rowValue.getTime() === condition.getTime();
  }
  return rowValue === condition;
}

export function createFakeDb(): FakeDb {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.keys(ID_FIELDS).map((m) => [m, []])
  );

  function matches(model: string, row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    for (const [key, condition] of Object.entries(where)) {
      const relation = RELATIONS[model]?.[key];
      if (
        relation &&
        condition &&
        typeof condition === 'object' &&
        !('in' in condition)
      ) {
        // Filtre relationnel, ex. { donation: { pharmacy_id: 'x' } }
        const related = tables[relation.model].find(
          (r) => r[relation.foreignKey] === row[relation.localKey]
        );
        if (!related || !matches(relation.model, related, condition))
          return false;
        continue;
      }
      if (!matchesValue(row[key], condition)) return false;
    }
    return true;
  }

  function attachIncludes(
    model: string,
    row: Row,
    include: Row | undefined
  ): Row {
    if (!include) return { ...row };
    const result: Row = { ...row };
    for (const [key, spec] of Object.entries(include)) {
      if (!spec) continue;
      const relation = RELATIONS[model]?.[key];
      if (!relation) continue;
      const subWhere =
        typeof spec === 'object' ? (spec as Row).where : undefined;
      const subInclude =
        typeof spec === 'object' ? (spec as Row).include : undefined;
      const rows = tables[relation.model].filter(
        (r) =>
          r[relation.foreignKey] === row[relation.localKey] &&
          matches(relation.model, r, subWhere)
      );
      result[key] = relation.single
        ? rows[0]
          ? attachIncludes(relation.model, rows[0], subInclude)
          : null
        : rows.map((r) => attachIncludes(relation.model, r, subInclude));
    }
    return result;
  }

  function applyData(row: Row, data: Row): void {
    for (const [key, value] of Object.entries(data)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !Array.isArray(value)
      ) {
        if ('increment' in value) {
          row[key] = (row[key] ?? 0) + value.increment;
          continue;
        }
        if ('decrement' in value) {
          row[key] = (row[key] ?? 0) - value.decrement;
          continue;
        }
      }
      row[key] = value;
    }
  }

  function insert(model: string, data: Row): Row {
    const idField = ID_FIELDS[model];
    const row: Row = { created_at: new Date(), updated_at: new Date() };
    // Défauts métier utiles aux tests
    if (model === 'donation') {
      Object.assign(row, {
        status: 'EN_COURS',
        attempt_count: 0,
        version: 0,
        action_id: null,
      });
    }
    if (model === 'donationLine') Object.assign(row, { quantity_allocated: 0 });
    if (model === 'donationProposal') {
      Object.assign(row, {
        status: 'ENVOYEE',
        token: randomUUID(),
        sent_at: new Date(),
        responded_at: null,
        refusal_reason: null,
      });
    }
    if (model === 'donationAllocation') {
      Object.assign(row, {
        status: 'PLANIFIEE',
        picked_up_by: null,
        picked_up_at: null,
        cerfa_number: null,
      });
    }
    if (model === 'donationEmailLog')
      Object.assign(row, {
        proposal_id: null,
        allocation_id: null,
        sent_at: new Date(),
      });
    if (model === 'donParametres')
      Object.assign(row, {
        seuil_dormance_jours: 90,
        rayon_matching_km: 50,
      });
    if (model === 'association') Object.assign(row, { score_pickup: 100 });

    // Nested create ({relation: {create: ...}}) vs colonne scalaire (ex. le
    // JSON `lines` d'une allocation) : seuls les objets {create} avec une
    // relation déclarée sont traités comme des créations imbriquées
    const nested: Record<string, Row> = {};
    const scalar: Row = {};
    for (const [key, value] of Object.entries(data)) {
      const isNestedCreate =
        RELATIONS[model]?.[key] &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'create' in value;
      if (isNestedCreate) nested[key] = value as Row;
      else scalar[key] = value;
    }
    Object.assign(row, scalar);
    row[idField] = row[idField] ?? randomUUID();

    for (const uniqueKeys of UNIQUE_SETS[model] ?? []) {
      if (uniqueKeys.some((k) => row[k] == null)) continue;
      const duplicate = tables[model].some((r) =>
        uniqueKeys.every((k) => r[k] === row[k])
      );
      if (duplicate) {
        throw Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        });
      }
    }

    tables[model].push(row);

    for (const [key, spec] of Object.entries(nested)) {
      const relation = RELATIONS[model][key];
      const items = Array.isArray(spec.create) ? spec.create : [spec.create];
      for (const item of items) {
        insert(relation.model, {
          ...item,
          [relation.foreignKey]: row[idField],
        });
      }
    }
    return row;
  }

  function makeModelApi(model: string) {
    return {
      create: async ({ data, include }: Row) => {
        const row = insert(model, data);
        return attachIncludes(model, row, include);
      },
      findUnique: async ({ where, include }: Row) => {
        const row = tables[model].find((r) => matches(model, r, where));
        return row ? attachIncludes(model, row, include) : null;
      },
      findFirst: async ({ where, include }: Row = {}) => {
        const row = tables[model].find((r) => matches(model, r, where));
        return row ? attachIncludes(model, row, include) : null;
      },
      findMany: async ({ where, include, orderBy, take }: Row = {}) => {
        let rows = tables[model].filter((r) => matches(model, r, where));
        if (orderBy && !Array.isArray(orderBy)) {
          const [[key, dir]] = Object.entries(orderBy) as [string, string][];
          rows = [...rows].sort((a, b) => {
            const av = a[key] instanceof Date ? a[key].getTime() : a[key];
            const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
            return (av < bv ? -1 : av > bv ? 1 : 0) * (dir === 'desc' ? -1 : 1);
          });
        }
        if (take) rows = rows.slice(0, take);
        return rows.map((r) => attachIncludes(model, r, include));
      },
      update: async ({ where, data, include, select }: Row) => {
        const row = tables[model].find((r) => matches(model, r, where));
        if (!row) {
          throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        }
        applyData(row, data);
        row.updated_at = new Date();
        void select;
        return attachIncludes(model, row, include);
      },
      updateMany: async ({ where, data }: Row) => {
        const rows = tables[model].filter((r) => matches(model, r, where));
        for (const row of rows) {
          applyData(row, data);
          row.updated_at = new Date();
        }
        return { count: rows.length };
      },
      upsert: async ({ where, update, create, include }: Row) => {
        const existing = tables[model].find((r) => matches(model, r, where));
        if (existing) {
          applyData(existing, update);
          existing.updated_at = new Date();
          return attachIncludes(model, existing, include);
        }
        const row = insert(model, create);
        return attachIncludes(model, row, include);
      },
      deleteMany: async ({ where }: Row = {}) => {
        const keep = tables[model].filter((r) => !matches(model, r, where));
        const count = tables[model].length - keep.length;
        tables[model] = keep;
        return { count };
      },
      count: async ({ where }: Row = {}) =>
        tables[model].filter((r) => matches(model, r, where)).length,
      groupBy: async ({ by, where, _count }: Row) => {
        void _count;
        const rows = tables[model].filter((r) => matches(model, r, where));
        const groups = new Map<string, Row>();
        for (const row of rows) {
          const key = (by as string[]).map((k) => String(row[k])).join('|');
          const group =
            groups.get(key) ??
            Object.assign(
              Object.fromEntries((by as string[]).map((k) => [k, row[k]])),
              { _count: { _all: 0 } }
            );
          group._count._all++;
          groups.set(key, group);
        }
        return [...groups.values()];
      },
    };
  }

  const db: FakeDb = {
    tables,
    seed: (model: string, row: Row) => insert(model, row),
  } as FakeDb;

  for (const model of Object.keys(ID_FIELDS)) {
    db[model] = makeModelApi(model);
  }

  // Transaction avec rollback : snapshot des tables, restauration si le
  // callback lève (suffisant pour tester les invariants de concurrence)
  db.$transaction = async (callback: (tx: FakeDb) => Promise<any>) => {
    const snapshot = JSON.parse(
      JSON.stringify(tables, (_k, v) =>
        v instanceof Date ? { __date: v.toISOString() } : v
      )
    );
    try {
      return await callback(db);
    } catch (err) {
      for (const model of Object.keys(tables)) {
        tables[model] = snapshot[model].map((row: Row) => reviveDates(row));
      }
      throw err;
    }
  };

  return db;
}

function reviveDates(value: any): any {
  if (value && typeof value === 'object') {
    if ('__date' in value) return new Date(value.__date);
    for (const key of Object.keys(value)) value[key] = reviveDates(value[key]);
  }
  return value;
}
