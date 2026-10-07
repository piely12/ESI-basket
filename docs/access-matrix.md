# Matrice d’accès par rôle

Les routes publiques ne demandent pas de compte. Les routes d’espace privé exigent une session active et un compte qui n’est pas en première connexion. Les contrôles côté serveur et le proxy appliquent les mêmes rôles; l’interface seule ne donne aucun droit.

| Route | Joueur | Coach | Coach adjoint | Statisticienne | Vidéaste | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| `/`, `/matchs`, `/classement`, `/equipe`, `/actualites`, `/reglages` | Lecture | Lecture | Lecture | Lecture | Lecture | Lecture |
| `/joueurs` | Accès | Refus | Refus | Refus | Refus | Accès |
| `/coach` et sous-routes (effectif, matchs, convocations, compositions/remplacements) | Refus | Accès | Accès | Refus | Refus | Accès |
| `/stats` | Refus | Refus | Refus | Accès | Refus | Accès |
| `/actus` | Refus | Refus | Refus | Refus | Accès | Accès |
| `/admin` | Refus | Refus | Refus | Refus | Refus | Accès |

Le coach et le coach adjoint partagent l’espace `/coach`, qui inclut la préparation des matchs et les opérations de composition et remplacements. L’administration peut ouvrir les cinq espaces privés selon les règles existantes. La migration `017_match_roster_staff_read.sql` rétablit une lecture des convocations limitée aux joueurs de l’équipe pour coach, coach adjoint et statisticienne. Les rôles joueur et vidéaste ne reçoivent pas de permissions supplémentaires par cette matrice.

## Vérification automatisée

Le smoke test Playwright correspondant se lance avec `SECURITY_TEST_BASE_URL` et `SECURITY_TEST_ACCOUNTS_JSON`. Fournir des comptes de test dédiés pour les six rôles; le script affiche `NON EXÉCUTÉ` pour tout rôle absent et ne journalise jamais les identifiants. Consulter `scripts/security-access.playwright.mjs`.
