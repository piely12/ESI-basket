# Audit de sécurité globale

Date : 7 octobre 2026. Audit statique du dépôt local. Aucun accès au projet Supabase distant, au tableau de bord Vercel ni aux journaux de fournisseurs n'a été utilisé. La migration `015_first_login_password.sql`, les routes `/login` et `/premiere-connexion` ainsi que leurs helpers sont hors du périmètre de cette passe.

## Constats prioritaires corrigés dans le code

- Les politiques RLS appellent désormais `is_current_app_session()`. Cette fonction refuse les comptes inactifs, les comptes forcés à changer de mot de passe et les anciens JWT coach/admin dont le `session_id` n'est plus celui de `active_sessions`.
- Les politiques joueur, roster, statistiques, convocations, blessures, suspensions, notifications et imports vérifient cet état de session lorsqu'elles protègent un accès privé.
- La migration 016 resserre les droits de colonnes sensibles (`created_by`, `published_by`, `validated_by`, `sent_by`, `author_id`) en retirant d'abord les grants globaux sur les tables concernées.
- La création des comptes admin et les changements de disponibilité sont limités par compte et IP via le RPC atomique `consume_rate_limit`. La création marque explicitement le compte `must_change_password=true`.
- La création/réassociation d'un compte programme une notification Brevo au membre. Le message ne contient pas le mot de passe provisoire; celui-ci doit être transmis séparément.
- La récupération OTP utilise des limites atomiques, un RPC d'émission transactionnel, des corps JSON stricts, des réponses non révélatrices, un délai minimum sur la demande d'envoi, et l'envoi d'e-mail différé. L'OTP reste haché en base.
- Le script local de création de comptes est désactivé par défaut, refuse l'environnement production, n'accepte plus les mots de passe dans les arguments shell et interdit la création d'un rôle admin.
- La CSP est désormais générée avec nonce dans `proxy.ts`, avec `default-src`, `script-src`, `object-src`, `base-uri`, `form-action` et `frame-ancestors`. `style-src-attr 'unsafe-inline'` est maintenu pour les quelques styles React dynamiques. `unsafe-eval` est seulement présent en développement pour Next.js.
- `contact_messages` ne permet plus l'insertion directe PostgREST tant qu'une route serveur anti-spam n'existe pas.
- `audit_logs` est en écriture seule pour `service_role`, protégé par un trigger append-only. Le trigger permet le `ON DELETE SET NULL` du seul `actor_user_id` sans autoriser la réécriture du contenu d'un événement.

Ces modifications sont livrées dans `supabase/016_global_security_hardening.sql`, `proxy.ts`, les routes OTP de récupération, `app/admin/actions.ts`, `lib/security.ts` et `scripts/create-user.mjs`. Aucune migration distante n'a été appliquée.

## Limites et risques restant à confirmer

- `x-real-ip` n'est fiable que si le proxy de production le remplace. L'application n'accepte pas `x-forwarded-for`; si l'hébergeur n'injecte pas `x-real-ip`, le quota par IP se regroupe sous `unknown` et le quota par utilisateur reste actif.
- La route de contact n'a pas encore de route serveur dédiée. L'envoi direct est donc bloqué, et le formulaire ne peut pas enregistrer de messages avant l'implémentation de cette route.
- L'audit a trouvé RLS activé pour les tables des migrations 001, 003, 009 et 015. Aucune vue SQL ni politique/bucket Supabase Storage n'est déclarée. Aucun flux d'upload Storage n'a été détecté dans le dépôt.
- La rétention des événements d'audit est définie à 365 jours, mais la purge doit être planifiée et exécutée par un propriétaire de base de données. `rate_limits` nécessite également une purge périodique.
- La route login envoie déjà une alerte Brevo lors d'une connexion admin et journalise les échecs/blocages. Elle n'envoie pas d'alerte e-mail lors d'échecs répétés ou d'un blocage. L'empreinte de tentative actuelle est SHA-256 de l'e-mail et de l'IP, pas un HMAC stable de l'e-mail. Le prompt interdit explicitement de modifier `/login` et ses helpers; ces deux écarts restent donc ouverts jusqu'à autorisation d'une passe dédiée.
- La CSP avec nonce rend les pages concernées dynamiques et peut réduire le cache statique/ISR. Les en-têtes observés en développement ne prouvent pas les en-têtes Vercel de production.
- Le dépôt ne contient pas `supabase/015_enforce_privileged_staff_mfa.sql`. Ne pas appliquer une copie de cette ancienne migration MFA sans audit; le projet a explicitement exclu MFA/TOTP.
- Les routes de récupération révoquent les sessions applicatives, mais le changement de mot de passe Supabase ne garantit pas à lui seul la révocation immédiate de tous les access tokens déjà émis. La vérification RLS des sessions privilégiées réduit le risque coach/admin; les autres rôles restent limités par l'état actif et la première connexion.

## Vérifications exécutées et non exécutées

- TypeScript, lint, scripts et tests locaux : résultats consignés dans la réponse de livraison.
- La réponse de développement locale confirme l'en-tête CSP et les en-têtes de base. Elle renvoie `Cache-Control: no-cache, must-revalidate` pour `/login` en développement, donc l'exigence `no-store` n'est pas confirmée par ce contrôle local.
- Tests avec comptes réels, requêtes RLS directes, parallélisme OTP, vérification des grants distants, Supabase Storage, Vercel production et scan des journaux externes : **NON EXÉCUTÉS** faute d'environnement de test autorisé/configuré.
- Le dépôt de travail contient d'autres changements antérieurs non liés à cette passe; ils ne doivent pas être annulés ni inclus automatiquement dans un commit.

## Actions opérateur

1. Vérifier l'historique de migrations sur Supabase. Appliquer `016_global_security_hardening.sql` uniquement si `015_first_login_password.sql` est déjà appliquée. Les numéros 015/016 peuvent diverger du tableau de bord distant.
2. Exécuter `supabase/tests/016_global_security_assertions.sql` sur un projet de test puis valider chaque rôle par PostgREST avec des comptes de test.
3. Vérifier les inscriptions publiques et les règles Auth du projet Supabase, ainsi que la configuration `x-real-ip` en production.
4. Contrôler l'historique Git et les journaux de déploiement pour les clés qui ont pu être partagées précédemment; révoquer toute clé encore active trouvée. Aucun secret n'est reproduit dans ce rapport.
5. Ne jamais placer la clé `service_role`, Brevo ou `OTP_PEPPER` sous une variable `NEXT_PUBLIC_`.

### Tests locaux réellement exécutés

- `tsc --noEmit` : PASS.
- ESLint sur le proxy, la configuration Next, la sécurité, les routes de récupération et les actions admin : PASS.
- `node --check` sur les scripts JavaScript : PASS.
- `node scripts/security-smoke.mjs` : PASS — les 5 espaces privés sans session répondent HTTP 307, `/test-connexion` répond HTTP 404, `/login` répond HTTP 200 avec CSP nonce et les deux en-têtes anti-sniff/clickjacking.
- Deux requêtes locales distinctes à `/login` : nonce CSP différent pour chaque réponse, PASS.
- `git diff --check` : PASS; Git signale uniquement des conversions de fins de ligne LF/CRLF dans le répertoire de travail.
- Scan ciblé des noms de secrets et préfixes connus dans le `.next/static` existant : aucun résultat. Le build existant a été scanné; aucune compilation de production neuve n'a été lancée.
- Scan de motifs de clés dans les chemins/commits accessibles de l'historique Git : aucun chemin ou commit correspondant aux motifs recherchés. Ce contrôle ciblé ne certifie pas l'absence de secret dans les journaux externes ni dans tous les objets d'un dépôt distant.

Les contrôles suivants n'ont pas été exécutés : Playwright (dépendance absente et aucun compte de test fourni), assertions SQL (pas de connexion de base de test/outil psql), matrice RLS par rôle, IDOR/API authentifiée, rate limit en charge, alertes Brevo et déploiement de production. Le test local constate aussi `Cache-Control: no-cache, must-revalidate` en mode développement sur `/login`; le `no-store` de production reste à confirmer.
