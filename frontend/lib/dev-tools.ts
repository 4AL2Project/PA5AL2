/**
 * Outils de dev destructifs (page `/admin/dev`). Miroir de `config.devToolsEnabled`
 * côté back. Flag explicite plutôt que `NODE_ENV`, car la stack locale tourne en
 * `NODE_ENV=production` sur une image prod-like. La prod ne définit jamais la
 * variable → la page et le lien de nav disparaissent.
 *
 * `NEXT_PUBLIC_*` est inliné au build : lisible en composant serveur comme client.
 */
export const devToolsEnabled = process.env.NEXT_PUBLIC_DEV_TOOLS_ENABLED
  ? process.env.NEXT_PUBLIC_DEV_TOOLS_ENABLED === 'true'
  : process.env.NODE_ENV !== 'production';
