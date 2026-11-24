# Démo des cartes joueurs

Cette démo est indépendante de la page Équipe de l’application. Elle utilise React + TypeScript, des CSS Modules, et charge Big Shoulders Display depuis Google Fonts dans `index.html`.

## Démarrer avec Vite

Depuis PowerShell :

```powershell
npm create vite@latest esi-player-card -- --template react-ts
cd esi-player-card
npm install
Copy-Item C:\esi-basket\player-card-demo\index.html .\index.html -Force
Copy-Item C:\esi-basket\player-card-demo\src\* .\src\ -Recurse -Force
npm run dev
```

## Fichiers du composant

- `src/components/PlayerCard.tsx` : carte responsive, types TypeScript, chargement image et placeholder SVG.
- `src/components/PlayerCard.module.css` : variables de couleur, aspect ratio, unités `cqw`, hover et reduced motion.
- `src/components/PlayerGrid.tsx` et `PlayerGrid.module.css` : grille responsive.
- `src/data/players.ts` : quatre exemples, deux avec photo et deux sans photo.
- `src/App.tsx` : page de démonstration.

Ajoute un joueur en ajoutant un objet dans `src/data/players.ts`.
Ajoute ou remplace sa photo en renseignant la propriété `photo` avec son URL ou un chemin tel que `/players/famien.webp`.
Si l’image est absente ou échoue, la carte montre automatiquement la silhouette et les initiales.
