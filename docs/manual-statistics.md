# Saisie manuelle des statistiques

## Parcours

1. La statisticienne ouvre `/stats`; seules les rencontres ESI terminées sont listées.
2. Elle ouvre une feuille et saisit le score, les totaux ESI et les statistiques des joueurs convoqués. L'enregistrement automatique conserve les champs vides en `NULL`; zéro doit être saisi explicitement. Le score reste privé pendant le brouillon.
3. « Terminer la saisie et vérifier » lance le contrôle serveur. Les incohérences bloquent le checkpoint; les écarts entre le score et les totaux sont affichés comme avertissements.
4. Elle confirme séparément le résultat, les totaux d'équipe, les joueurs convoqués et les avertissements. Elle confirme ensuite la publication; le score et les statistiques deviennent publics à cette étape.
5. Une feuille publiée est en lecture seule. Une correction exige un motif, puis repasse par les contrôles, le checkpoint et la publication.

Les pourcentages de tirs sont dérivés de `réussis / tentés`. Les rebonds totaux individuels sont dérivés des rebonds défensifs et offensifs lorsqu'ils sont tous deux renseignés. Aucun champ `+/-` n'est proposé ou accepté par l'API statistienne. Les anciennes valeurs restent conservées dans les données historiques.

## Accès par rôle

| Rôle | `/stats` | Feuille | Écriture / publication |
| --- | --- | --- | --- |
| Statisticienne ESI active | Oui | Match terminé de son équipe | Oui, via l'API protégée et les fonctions SQL |
| Joueur | Non | Non | Non |
| Coach / coach adjoint | Non | Non | Non dans cet espace; leur gestion sportive reste sous `/coach` |
| Vidéaste | Non | Non | Non |
| Admin | Non | Non | Non dans cet espace; son administration reste sous `/admin` |
| Visiteur non connecté | Non | Non | Non |

La page, le layout et l'API exigent le rôle `statisticienne`. Les fonctions SQL vérifient à nouveau le rôle, l'équipe ESI, l'état actif, le match terminé et les convocations. Les rôles navigateur ne peuvent plus écrire directement dans les tables de statistiques. Les tables d'import Excel/IA historiques restent présentes sans suppression de données, mais sont révoquées pour les rôles applicatifs.

## Installation

Appliquer `supabase/019_manual_post_match_stats.sql` après `001` à `018`. Cette migration retire les écritures directes des sessions navigateur, ajoute l'état du parcours et les opérations atomiques protégées. Ne pas supprimer ni réinitialiser les anciennes lignes statistiques.

## Vérifications

- `npm run test:stats-manual` couvre les valeurs nulles, le zéro explicite, les tirs incohérents, la formule des points, les scores incomplets et le rejet de `+/-`.
- `npx tsc --noEmit` et ESLint ciblé vérifient les pages et l'API.
- Les réponses d'accès réelles par rôle, la persistance Supabase et la publication doivent être vérifiées sur un environnement connecté après application de la migration; les tests unitaires ne remplacent pas cette validation intégrée.
