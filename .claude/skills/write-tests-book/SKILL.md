---
name: write-tests-book
description: Écris le cahier de test d'une user story
---

Écrit un cahier de test pour cette us $ARGUMENTS en .md de préférence.

Le cahier de test doit être stocké dans le dossier `tests-book` à la racine du projet en suivant la convention de nommage suivante: `test-books-{{us-id}}.md`. Avec `us-id` représentant l'id de l'us que tu trouvera dans le fichier HTML de l'us

Utilise le fichier `tests-book.example.md` disponible dans le dossier `tests-book` (à la racine du prot) comme exemple.

iL faut tester des cas concrèts à l'image de ce que le métier pourrais tester. 

- Donc il faut éviter de faire 10 000 tests qui teste tout et n'importe quoi
- Le test doit avoir une valeur unique
