# Aetheris

Générateur et coffre-fort de mots de passe **100 % local** : tout s'exécute dans le navigateur, rien n'est envoyé à un serveur.

## Fonctionnalités

- **Générateur** : mot de passe, phrase de passe (1 024 mots français, 10 bits/mot) ou code PIN. Aléa `crypto.getRandomValues` avec tirage par rejet (aucun biais de modulo), entropie calculée exactement (inclusion–exclusion).
- **Vérificateur** : estimation de robustesse qui repère les motifs (dictionnaire, clavier, dates, répétitions, leet), temps de cassage selon 3 scénarios, et recherche dans les fuites Have I Been Pwned en k-anonymat.
- **Coffre-fort** : identifiants, catégories, favoris, codes 2FA (TOTP RFC 6238), fichiers chiffrés, audit de santé, verrouillage automatique, effacement du presse-papiers.
- **Import / export** : CSV de Chrome, Edge, Firefox, Safari, Bitwarden et 1Password. Sauvegarde chiffrée et restauration.
- **PWA** : fonctionne hors ligne et peut s'installer comme une application.

## Sécurité

| | |
|---|---|
| Chiffrement | AES-256-GCM, IV aléatoire de 96 bits par écriture |
| Dérivation | PBKDF2-HMAC-SHA256, 600 000 itérations, sel de 128 bits |
| Clés | Clé de données aléatoire (DEK) enveloppée par la clé dérivée (KEK) |
| Stockage | IndexedDB, chaque fichier chiffré séparément |
| En-têtes | CSP stricte (`script-src 'self'`), HSTS, `frame-ancestors 'none'` |

Toute la logique cryptographique tient dans [`src/lib/crypto.ts`](src/lib/crypto.ts) et [`src/lib/storage.ts`](src/lib/storage.ts).

Les coffres créés par la version 1 (`vault.html`, clé `aetheris_vault_v1` dans le localStorage) sont **migrés automatiquement** au premier déverrouillage, fichiers compris.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (Vitest), dont les vecteurs officiels RFC 4226 / 6238
npm run build    # build de production dans dist/
```

Stack : React 19, TypeScript, Vite, Tailwind CSS 4, wouter, idb-keyval.

## Déploiement

Site statique : `vercel.json` gère la réécriture SPA, les en-têtes de sécurité et les redirections des anciennes URL (`/forge.html`, `/vault.html`).
