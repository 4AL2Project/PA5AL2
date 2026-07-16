import 'server-only';

/**
 * URL du backend telle que le **serveur Next** doit la joindre.
 *
 * Elle diffère de `NEXT_PUBLIC_API_URL`, qui est l'URL vue par le **navigateur** :
 * en conteneur, le serveur passe par le réseau Docker (`http://api:3005`) tandis
 * que le navigateur passe par le port publié (`http://localhost:3005`). Confondre
 * les deux rend le backend injoignable depuis les Server Components.
 *
 * Sans préfixe `NEXT_PUBLIC_`, la valeur est lue au runtime et jamais inlinée
 * dans le bundle client. Le repli sur `NEXT_PUBLIC_API_URL` couvre le dev sur
 * l'hôte, où les deux URL coïncident.
 */
export const SERVER_API_BASE =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3005';
