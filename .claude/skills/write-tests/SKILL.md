---
name: write-tests
description: Écris le cahier de test d'une user story
---

Écrit un cahier de test (spec) pour cette us $ARGUMENTS en utilisant jest et/ou Playwright (pour le front).

### Rules
- Chaque critère d'acceptance doit avoir un ou plusieurs tests.
- Groupe certains tests ensemble si nécessaire
- les cas de tests doivent êtres des cas concrèts à l'image de ce que le métier pourrais tester. 
- Chaque test doit être précis et concis
- Chaque test doit être suffissament petit pour être tester individuellement
- Mock tous éléments nécessaires au test
