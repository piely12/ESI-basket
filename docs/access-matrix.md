# Matrice d’accès par rôle

Les routes publiques ne demandent pas de compte. Les routes d’espace privé exigent une session active et un compte qui n’est pas en première connexion. Les contrôles côté serveur et le proxy appliquent les mêmes rôles; l’interface seule ne donne aucun droit.

| Route | Joueur | Coach | Statisticienne | Admin |
| --- | --- | --- | --- | --- |
| `/`, `/matchs`, `/classement`, `/equipe`, `/reglages` | Lecture | Lecture | Lecture | Lecture |
| `/joueurs` | Accès | Refus | Refus | Accès |
| `/coach` et sous-routes (effectif, matchs, convocations, compositions/remplacements) | Refus | Accès | Refus | Accès |
| `/stats` | Refus | Refus | Accès | Accès |
| `/admin` et sous-routes (`staff`, `joueurs`, `journal`) | Refus | Refus | Refus | Accès |

Le coach principal est le seul rôle de coaching; il gère seul l’espace `/coach`, qui inclut la préparation des matchs et les opérations de composition et remplacements. L’administration peut ouvrir les espaces privés selon les règles existantes.

L’administration ESI est organisée dans `/admin/staff`, `/admin/joueurs` et `/admin/journal`. Elle crée ou rattache les comptes depuis les fiches ESI, sans définir leur mot de passe. Les comptes invités restent inactifs jusqu’à la vérification par code e-mail et au choix du mot de passe. L’administration peut renvoyer ou annuler une invitation, suspendre/réactiver un compte (avec motif à la suspension) et consulter les 100 dernières entrées du journal. Ces opérations sont limitées aux fiches de l’équipe ESI et journalisées. Migrations `025_remove_assistant_coach.sql` et `026_admin_account_controls.sql` : suppression du rôle coach adjoint et prise en charge du parcours d’accès.

La migration `017_match_roster_staff_read.sql` rétablit une lecture des convocations limitée aux joueurs de l’équipe pour le coach et la statisticienne.

## Vérification automatisée

Le smoke test Playwright correspondant se lance avec `SECURITY_TEST_BASE_URL` et `SECURITY_TEST_ACCOUNTS_JSON`. Fournir des comptes de test dédiés pour les quatre rôles; le script affiche `NON EXÉCUTÉ` pour tout rôle absent et ne journalise jamais les identifiants. Consulter `scripts/security-access.playwright.mjs`.
