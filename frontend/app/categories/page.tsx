'use client';

import { Loader2, Lock, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '@/lib/api';
import { Category } from '@/lib/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await fetchCategories());
    } catch {
      toast.error('Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewName('');
      toast.success('Catégorie créée');
    } catch (e) {
      toast.error(
        e instanceof Error && e.message.includes('already')
          ? 'Cette catégorie existe déjà'
          : 'Impossible de créer la catégorie'
      );
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.category_id);
    setEditingName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    setBusyId(id);
    try {
      const updated = await updateCategory(id, name);
      setCategories((prev) =>
        prev.map((c) => (c.category_id === id ? updated : c))
      );
      cancelEdit();
      toast.success('Catégorie renommée');
    } catch (e) {
      toast.error(
        e instanceof Error && e.message.includes('already')
          ? 'Cette catégorie existe déjà'
          : 'Impossible de renommer la catégorie'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cat: Category) => {
    setBusyId(cat.category_id);
    try {
      await deleteCategory(cat.category_id);
      setCategories((prev) =>
        prev.filter((c) => c.category_id !== cat.category_id)
      );
      toast.success('Catégorie supprimée');
    } catch {
      toast.error('Impossible de supprimer la catégorie');
    } finally {
      setBusyId(null);
    }
  };

  const systemCount = categories.filter((c) => c.is_system).length;
  const ownCount = categories.length - systemCount;

  return (
    <>
      <DashboardLayout
        title="Catégories"
        description={
          loading
            ? 'Chargement…'
            : `${systemCount} par défaut · ${ownCount} personnalisée${ownCount !== 1 ? 's' : ''}`
        }
      >
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg border border-border/50 bg-card p-4">
            <p className="mb-3 text-sm font-medium">Ajouter une catégorie</p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                }}
                placeholder="Nom de la catégorie"
                disabled={creating}
              />
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="gap-1.5"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Ajouter
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-card">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Tag className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Aucune catégorie pour le moment.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {categories.map((cat) => {
                  const isEditing = editingId === cat.category_id;
                  const isBusy = busyId === cat.category_id;
                  return (
                    <li
                      key={cat.category_id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              void handleUpdate(cat.category_id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          className="h-8 flex-1"
                          disabled={isBusy}
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium">
                          {cat.name}
                        </span>
                      )}

                      {cat.is_system ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] text-muted-foreground"
                        >
                          <Lock className="h-3 w-3" />
                          Par défaut
                        </Badge>
                      ) : isEditing ? (
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            tooltip="Enregistrer"
                            disabled={isBusy || !editingName.trim()}
                            onClick={() => handleUpdate(cat.category_id)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            tooltip="Annuler"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </IconButton>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            tooltip="Renommer"
                            onClick={() => startEdit(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            tooltip="Supprimer"
                            className="text-destructive hover:text-destructive"
                            disabled={isBusy}
                            onClick={() => setConfirmDelete(cat)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </IconButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Les catégories par défaut sont partagées et ne peuvent pas être
            modifiées. Elles servent à classer vos offres dans le catalogue.
          </p>
        </div>
      </DashboardLayout>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="Supprimer cette catégorie ?"
        description={
          confirmDelete
            ? `La catégorie "${confirmDelete.name}" sera retirée de toutes les offres qui l'utilisent. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (confirmDelete) {
            void handleDelete(confirmDelete);
            setConfirmDelete(null);
          }
        }}
      />
    </>
  );
}
