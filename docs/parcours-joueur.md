# Parcours joueur

1. Le staff enregistre l'e-mail du joueur (admin → invitation). Le joueur reçoit un code à 6 chiffres.
2. Sur `/mot-de-passe-oublie?invitation=1` (« Créer mon compte ») : e-mail + code, puis **pseudo** et **mot de passe**
   (8 caractères minimum, majuscule, minuscule, chiffre, caractère spécial ; 72 octets maximum).
3. Connexion ensuite avec **e-mail + mot de passe** ; le pseudo n'est qu'un nom affiché (modifiable dans Profil).
4. L'espace `/joueurs` est une app mobile : Convocations, Notifications, Stats, Profil. Il s'installe avec son propre
   manifeste (`/manifest-joueur.webmanifest`, démarrage sur `/joueurs`).
5. Quand le coach publie la composition, la base crée la notification dans l'app (« Vous êtes convoqué(e) pour le match
   contre [Équipe] à [heure]. ») et le serveur l'envoie aussi sur les téléphones activés (Profil → Notifications).

## À appliquer
- Exécuter `supabase/041_parcours_joueur.sql` dans l'éditeur SQL Supabase (après 001–040).
- Variables VAPID déjà utilisées par les rappels de match (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- Sans la migration 041, tout continue de fonctionner mais sans pseudo ni push personnel.

## Données
- `player_pseudos` : pseudo unique (insensible à la casse), lu par le joueur seul, écrit par le serveur.
- `player_push_subscriptions` : appareils des joueurs, accessibles au serveur uniquement.
- `match_composition_notifications.push_sent_at` : une convocation n'est envoyée qu'une fois sur le téléphone.
