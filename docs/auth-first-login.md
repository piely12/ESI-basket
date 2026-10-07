# Connexion et première connexion

Ce flux utilise Supabase Auth pour l'identité et les mots de passe. Les rôles existants restent dans `staff` et `players`; les indicateurs d'accès (`is_active`, `must_change_password`) sont ajoutés à `public.users`.

## Installation

1. Vérifier les variables serveur dans `.env.local` à partir de `.env.example` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` et `OTP_PEPPER`. Ne jamais publier les valeurs, même dans un rapport de test.
2. Dans Supabase SQL Editor, appliquer `supabase/015_first_login_password.sql` après les migrations 001 à 014. Cette migration n'a pas été exécutée à distance par le dépôt.
3. Vérifier que l'adresse expéditrice Brevo est autorisée et que les inscriptions publiques Supabase sont désactivées si seuls les comptes créés par le staff sont admis.
4. Les comptes déjà présents sont conservés avec `must_change_password = false`. Le trigger marque les nouveaux comptes Auth à `true`. Pour imposer le changement à un compte existant, mettre `must_change_password = true` sur sa ligne `public.users` depuis un outil d'administration protégé.
5. Démarrer l'application avec `npm run dev`, puis ouvrir `/login`. Aucun rôle n'est choisi sur l'écran de connexion; il est lu côté serveur depuis le profil staff/joueur.

Ne pas appliquer l'ancienne migration locale `015_enforce_privileged_staff_mfa.sql` si elle existe dans une copie ou un historique antérieur. Ce parcours ne comporte pas de MFA, TOTP ou QR code.

## Tests relançables

### Vérifications HTTP avec curl (PowerShell)

Lancer le serveur dans un terminal, puis dans un autre terminal PowerShell définir des comptes de test dédiés :

```powershell
$env:AUTH_TEST_BASE_URL = 'http://localhost:3000'
$env:AUTH_TEST_EMAIL = 'compte-de-test@exemple.invalid'
$env:AUTH_TEST_BAD_PASSWORD = 'mot-de-passe-incorrect'
$env:AUTH_TEST_UNKNOWN_EMAIL = 'adresse-inexistante@exemple.invalid'
./scripts/auth-curl-checks.ps1
```

Le script compare mauvais mot de passe et adresse inconnue, teste les origines CSRF et sollicite le limiteur de tentatives. Il affiche le code HTTP et un résultat PASS/FAIL. Utiliser un compte de test qui peut être temporairement limité; ne pas utiliser un compte réel de joueur ou de staff.

### Vérifications navigateur avec Playwright

Installer Playwright dans l'environnement de développement puis son navigateur Chromium, démarrer l'application et exécuter :

```powershell
npm install --save-dev playwright
npx playwright install chromium
$env:AUTH_TEST_BASE_URL = 'http://localhost:3000'
node ./scripts/auth-login.playwright.mjs
```

Le script utilise une réponse d'authentification simulée; il vérifie dimensions 360/1440 px, autofocus, attributs d'autofill, affichage du mot de passe, touche Échap, double soumission, état d'attente, absence de navigation/rechargement, Cache-Control et noms/format de secrets dans les bundles chargés. Il ne prouve pas la connexion réelle, le parcours OTP ni les permissions de chaque rôle.

## Tests d'intégration qui exigent le projet Supabase

Les tests nécessitant des comptes, une migration appliquée, l'envoi Brevo et les rôles provisionnés doivent être exécutés sur un projet de test. Pour chaque rôle (`admin`, `coach`, `coach_adjoint`, `statisticienne`, `videaste`, `joueur`), conserver seulement le résultat, le code HTTP, et une route de redirection non personnelle. Tester aussi OTP valide/expiré/réutilisé/après cinq erreurs et les tentatives concurrentes. Ne jamais enregistrer le mot de passe, le code, le jeton, les en-têtes `Set-Cookie` ou une adresse e-mail réelle dans les preuves.

Tout test non exécuté est à inscrire comme **NON EXÉCUTÉ**, jamais comme PASS. Les scripts actuels couvrent seulement les contrôles explicitement indiqués ci-dessus; ils ne remplacent pas une campagne d'intégration complète.
