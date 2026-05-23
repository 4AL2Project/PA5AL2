---
name: implement-us
description: Implémente une us à partir de son ID Notion
---

Implémente cette us: $ARGUMENTS.

Checkout sur la branche `feat-{{us-id}}`

Récupère les informations de l'us à partir de son ID Notion.

Commence par écrire le cahier de test (les spec) de l'us en utilisant le skill `/write-test {{us-id}}`.

En suite:
1. Implémente les éléments demandés dans l'us sans rajouté de superflu.
2. Implémente en respectant les bonnes pratiques en terme de qualité de code et de sécurité .
3. Met à jours les tests (spec, e2e, stories, unitaires) si existant.

En fin:
Test l'us et corrige si besoin:
- en utilisant le skill `/test-us-visualy {{us-id}}` pour le front
- `test-us {{us-id}}` pour le back

Commit les changements