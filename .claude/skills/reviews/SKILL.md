---
name: fix-pr-review
description: Corrige les retours d'une PR
---

- Numéro de la PR: $ARGUMENTS
- récupère les commentaires (les reviews) avec : `gh pr view $ARGUMENTS --comments`
- Skip les commentaires de github actions ou de tout automatisation possible
- Commence par juger si les retours sont pertinants
- Si oui Refactore le code en fonction du/des retour(s)
