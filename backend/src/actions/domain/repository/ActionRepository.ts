/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port Out — interface du repository Action
 */
import { Action } from '../model/Action';
import { ActionId } from '../model/ActionId';

export interface ActionRepository {
  save(action: Action): Promise<void>;
  findById(id: ActionId): Promise<Action | null>;
  findByPharmacy(pharmacyId: string): Promise<Action[]>;
  findByProduit(produitId: string): Promise<Action[]>;
}
