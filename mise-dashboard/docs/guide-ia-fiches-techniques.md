# Rédiger des fiches techniques au format Mise (pour import)

Tu génères des fiches techniques de cuisine au format markdown ci-dessous, pour un import direct dans l'écran "Importer" du dashboard Mise. Respecte cette syntaxe à la lettre — un format incorrect fait échouer l'import ou perdre des informations.

## Règles générales

- Chaque fiche commence par un titre de niveau 1 : `# Nom de la fiche`.
- Pour plusieurs fiches à la suite, enchaîne simplement les blocs : dès qu'un nouveau `# Titre` apparaît, une nouvelle fiche commence. Aucun séparateur n'est nécessaire entre deux fiches.
- Juste après le titre : un bloc de métadonnées `Clé: valeur` (une par ligne), avant la première section `##`.
- Les sections utilisent des titres de niveau 2 (`## Nom`), avec un **vocabulaire fixe** (liste ci-dessous). Tout titre `##` qui ne correspond pas exactement à l'un de ces noms est **ignoré silencieusement** — n'invente pas de section.
- Les accents/majuscules n'ont pas d'importance pour les clés de métadonnées et les noms de section, mais respecte l'orthographe ci-dessous.

## Bloc de métadonnées (optionnel, sous le titre)

| Clé | Valeur attendue |
|---|---|
| `Station` | Une valeur **exactement** dans la liste ci-dessous (accents/majuscules non sensibles). Toute autre valeur est ignorée — la fiche est quand même créée, sans station. |
| `Catégorie` | Idem, une valeur de la liste des catégories ci-dessous. |
| `Portions` | Nombre entier. Par défaut 10 si absent. |
| `Difficulté` | 1, 2 ou 3 (voir légende ci-dessous). Par défaut 1 si absent. |

### Stations disponibles

- Viande
- Poisson
- Froid
- Dessert
- Brunch

### Catégories disponibles

- Amuse-bouche
- Entrées
- Poissons
- Viandes
- Desserts
- Soupes
- Salades
- Pâtes
- Riz
- Légumes
- Fromages
- Sauces
- Boissons
- Cocktails
- Petit-déjeuner
- Brunch

N'invente pas de station ou de catégorie hors de ces deux listes : la valeur serait simplement ignorée à l'import (la fiche se crée quand même, mais sans station/catégorie associée).

### Échelle de difficulté

| Valeur | Signification |
|---|---|
| `1` | Facile |
| `2` | Moyen |
| `3` | Difficile |

Aucune autre valeur n'est acceptée (pas de `0`, pas de `4`, pas de demi-niveau).

## Sections reconnues (toutes optionnelles, dans l'ordre que tu veux)

1. `## Description` — texte libre.
2. `## Matériel` — liste à puces (`- `), un élément par ligne.
3. `## Ingrédients` — syntaxe détaillée ci-dessous.
4. `## Mise en place` — texte libre.
5. `## Étapes` — liste numérotée, syntaxe minuteur ci-dessous.
6. `## Dressage` — texte libre.
7. `## Conseil du chef` — texte libre.
8. `## HACCP` — texte libre.
9. `## Conservation` — texte libre.

## Syntaxe des ingrédients

```
## Ingrédients
### Pâte
- Farine de blé — 0.5 kg
- Oeufs — 4 pièce
### Divers
- Beurre — 0.05 kg
- Sel
```

- Format : `- Nom — Quantité Unité`. **Le séparateur est un tiret cadratin « — » (em dash), jamais un simple tiret « - ».**
- Décimales : point ou virgule (`0.5` ou `0,5`) acceptés.
- Un ingrédient sans quantité reconnue (ex. `- Sel`) est accepté tel quel.
- `### Nom du groupe` (optionnel) regroupe les ingrédients sous une sous-recette (« Pâte », « Sauce »...). S'applique jusqu'au `###` suivant.
- Un ingrédient absent du catalogue est **créé automatiquement** à l'import (nom + unité seulement, sans prix/catégorie/allergène — à compléter ensuite). Utilise donc des noms simples et cohérents (« Farine de blé », pas « farine T55 bio artisanale »).

## Syntaxe des étapes

```
## Étapes
1. Mélanger la farine et les oeufs dans un saladier.
2. Ajouter le lait progressivement en fouettant.
3. Laisser reposer la pâte au frais. (30 min)
```

- Liste numérotée (`1.` ou `1)`) — seul l'ordre compte, pas le chiffre.
- Minuteur optionnel en toute fin de ligne : `(30 min)` (le mot « min » est obligatoire).

## Exemple complet (deux fiches à la suite)

```markdown
# Crêpes sucrées
Station: Dessert
Catégorie: Brunch
Portions: 8
Difficulté: 2

## Description
Crêpes classiques pour le brunch du dimanche, à servir avec du sucre ou de la confiture.

## Matériel
- Fouet
- Poêle antiadhésive
- Saladier

## Ingrédients
### Pâte
- Farine de blé — 0.5 kg
- Oeufs — 4 pièce
- Lait entier — 0.75 L
### Divers
- Beurre — 0.05 kg

## Mise en place
Sortir le beurre à température ambiante, peser la farine et casser les oeufs avant de commencer.

## Étapes
1. Mélanger la farine et les oeufs dans un saladier.
2. Ajouter le lait progressivement en fouettant.
3. Laisser reposer la pâte au frais. (30 min)
4. Cuire chaque crêpe 1 à 2 minutes de chaque côté. (2 min)

## Dressage
Empiler 3 crêpes pliées en éventail, saupoudrer de sucre glace.

## Conseil du chef
Laisser reposer la pâte au moins 30 minutes pour des crêpes plus moelleuses.

## HACCP
Respecter la chaîne du froid pour le lait et les oeufs.

## Conservation
Se conserve 48h au réfrigérateur dans un contenant hermétique.

# Pain perdu
Station: Dessert
Portions: 6
Difficulté: 1

## Ingrédients
- Pain rassis — 6 pièce
- Oeufs — 3 pièce
- Lait entier — 0.3 L

## Étapes
1. Tremper les tranches de pain dans le mélange oeufs-lait.
2. Cuire à la poêle jusqu'à coloration dorée. (4 min)
```

## Vérifie avant de répondre

- [ ] Chaque fiche commence par `# Titre` (un seul `#`).
- [ ] Les métadonnées sont juste après le titre, avant la première `##`.
- [ ] `Station` (si renseignée) est bien l'une des 5 valeurs listées.
- [ ] `Catégorie` (si renseignée) est bien l'une des 16 valeurs listées.
- [ ] `Difficulté` (si renseignée) vaut 1, 2 ou 3.
- [ ] Seuls les 9 noms de section listés sont utilisés — aucun titre inventé.
- [ ] Les ingrédients utilisent bien « — » (tiret cadratin), pas « - ».
- [ ] Les minuteurs sont au format `(X min)` en toute fin de ligne d'étape.
- [ ] Aucun texte avant le premier `# Titre` (il serait ignoré).

---

