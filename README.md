# Site TCM — Transport Clermont Métropole

Site statique hébergé sur Vercel, sans base de données. Toutes les données sont des fichiers JSON du dossier `data/`.

## Pages

| Page | Fichier | Données |
|---|---|---|
| Accueil | `index.html` | réseau, info trafic, parkings, agences, actualités |
| Lignes | `reseau.html` | `data/reseau.json` |
| Fiche ligne | `ligne.html?l=A` | `data/reseau.json`, `data/trafic.json`, `data/calendrier.json` |
| Nouveau réseau | `nouveau-reseau.html` | `data/reseau.json` |
| Info trafic | `trafic.html` | `data/trafic.json` ou une feuille Google (voir plus bas) |
| Tarifs | `tarifs.html` | `data/tarifs.json` |
| Agences | `agences.html` | `data/agences.json` |
| Parkings relais | `parkings.html` | `data/parkings.json` |
| Réseau de nuit | `nuit.html` | `data/reseau.json` |
| Actualités | `actualites.html` | site d'actualités WordPress (`data/config.json`) |
| Archives | `archives.html` → `src/*.html` | pages d'événements passés, conservées telles quelles |

Les anciennes adresses (`/src/reseau.html`, `/src/trafic.html`…) redirigent vers les nouvelles (`vercel.json` et petites pages de redirection dans `src/`).

## Mettre à jour l'info trafic

**Option 1 — fichier JSON.** Modifier `data/trafic.json` : une entrée par message, avec `lignes` (`["A", "10"]`, ou `["TCM"]` pour tout le réseau), `type` (`interruption`, `perturbation`, `travaux`, `evenement`, `information`), `debut`, `fin`, `titre`, `detail`. Le message apparaît et disparaît tout seul selon les dates.

**Option 2 — feuille Google, sans redéployer.** Créer une feuille avec les colonnes `lignes, type, debut, fin, titre, detail` (lignes séparées par des virgules), puis *Fichier > Partager > Publier sur le Web > CSV*. Coller le lien dans `data/config.json`, clé `trafic_google_sheet_csv`. Le site lit la feuille à chaque visite et revient au fichier JSON si elle est injoignable.

## Mettre à jour le réseau

`data/reseau.json` (lignes, fréquences, parcours, correspondances, véhicules) et `img/lignes/` sont fabriqués à partir des fichiers de l'assistant d'exploitation :

```
python outils/generer_reseau.py "F:/Perso/Assistant exploitation"
```

Le script lit le récap N6, les grilles d'affectation, la comparaison N5/N6, l'électrification, le planning d'ouverture et le calendrier scolaire. Il ne touche jamais aux fichiers modifiés à la main (`trafic.json`, `tarifs.json`, `agences.json`, `parkings.json`, `config.json`).

## Styles

Tailwind CSS v4 (+ daisyUI pour les pages d'archives). Source : `assets/css/site.css`, fichier compilé : `dist/output.css` (déjà à jour dans le dépôt).

```
npm install
npm run css          # recompile dist/output.css
npm run css:watch    # recompile à chaque modification
```

Police : Citroën Type (`assets/fonts/`), la même que les dossiers du réseau. Icônes : Font Awesome (kit du site).

## Organisation

```
index.html, reseau.html, ligne.html…   pages
assets/css/site.css                    styles (source Tailwind)
assets/js/site.js                      en-tête, pied de page, thème, données communes
assets/js/pages/*.js                   script de chaque page
assets/fonts/                          Citroën Type (woff2)
data/                                  données du site (JSON)
img/lignes/                            pictogrammes des lignes
img/photos/                            photos (WebP, 960 et 1920 px) — © Daimler Truck AG / EvoBus
outils/generer_reseau.py               génération de data/reseau.json
src/                                   pages d'archives et leurs scripts
```

## Plans de ligne et calculateur d'itinéraire

Source : les plans N6 publiés dans **AO Mobility Plan Studio** (tm-ao-beta.vercel.app).

- En ligne, le site les lit en direct par `/api/plans-n6` (réécriture vers le jeu dans `vercel.json`) : un plan publié dans l'outil apparaît sur le site sans redéploiement (cache de 10 min).
- `data/plans_n6.json` sert de secours (jeu injoignable, tests en local). Le mettre à jour avec `npm run plans` (`python outils/maj_plans.py`).
- `data/noms_arrets.json` : nom du jeu → nom affiché, alias, arrêts sans nom partagés par deux lignes (repérés par l'identifiant de l'arrêt dans le plan), lignes de nuit qui suivent un tracé de jour.
- Le calculateur (`itineraire.html`) construit son graphe dans le navigateur : plans N6 + temps et fréquences de `data/reseau.json`. Lignes sans plan (cars 2xx, E1, BEN2, BEN4) reliées par leurs terminus. Scolaires et TAD exclues.
- Durée estimée = attente moyenne (moitié de l'intervalle au moment du départ) + temps de parcours réparti entre les arrêts + 4 min par correspondance.
- Les fiches lignes affichent le plan complet quand il existe, sinon le schéma terminus et tronçons.

## Passages, arrêts et carte en direct

- `arret.html?a=<arrêt>` : prochains départs de toutes les lignes d'un arrêt ; `ligne.html` : prochains passages à l'arrêt choisi ; `carte.html` : tracés et véhicules sur le fond de carte de Clermont-Ferrand.
- Les passages sont **théoriques** : les départs s'enchaînent au rythme des fréquences de `reseau.json` (créneau, jour, vacances), décalés d'une valeur propre à chaque ligne. Toutes les pages donnent les mêmes heures. Pas de suivi GPS.
- `data/positions.json` : position des arrêts sur le plan du jeu (pixels), convertie autour de la gare de Clermont-Ferrand ; communes hors plan en coordonnées réelles.
- Carte : Leaflet (cdnjs) et fond CARTO / OpenStreetMap, chargés uniquement sur les pages qui ont une carte.
- Lignes scolaires : message automatique pendant les vacances, les week-ends et les jours fériés, avec la date de reprise.
- Agences : « Ouvre bientôt », « Ferme bientôt » (45 min), prochaine ouverture quand l'agence est fermée.

## Vélos en libre service

`velos.html` : les six stations (onglet `velos` de la feuille Google, sinon `data/velos.json`), disponibilité estimée une fois ouvertes, carte et tarifs (groupe vélo de `data/tarifs.json`). Les stations apparaissent aussi sur la carte en direct et sur les pages des arrêts.

Fond de carte : tuiles OpenStreetMap (gratuites, attribution obligatoire), assombries par CSS en thème nuit.
