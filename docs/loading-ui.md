# États de chargement et états vides

- Les primitives réutilisables sont dans `components/ui/Skeleton.tsx`, `components/ui/PageSkeletons.tsx` et `components/ui/EmptyState.tsx`.
- Le logo du splash utilise `public/logos/esi.png`, déjà présent dans le dépôt. `esi-splash.png` n’existe pas actuellement.
- Le splash est monté dans `app/layout.tsx`; son script de session utilise le nonce CSP transféré par `proxy.ts`.
- Les placeholders de route sont les `loading.tsx` des dossiers `app/`. Ils reprennent les marges, grilles et cartes des pages réelles.
- `app/error.tsx` utilise `retry()` selon l’API Next.js 16 du dépôt.
- Les états vides du calendrier, de l’effectif et du classement passent par `EmptyState`.

Pour ajouter un état vide, importer `EmptyState` et fournir un titre, une phrase d’aide courte et, si utile, une action. Pour une nouvelle route, créer son `loading.tsx` avec `PageSkeleton` ou les primitives.
