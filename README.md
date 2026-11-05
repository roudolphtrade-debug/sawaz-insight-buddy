# Sawaz Pilot

Sawaz Pilot est le cockpit interne de Sawaz pour piloter les missions clients, les réponses, les indicateurs, les analyses et les restitutions.

**Domaine cible de production** : https://pilot.sawaz.fr

**Aperçu actuel** : https://id-preview--e03240e5-f416-40c7-844a-978d989b2ee7.lovable.app

## Architecture

- **Sawaz Collect** : collecte externe
- **Sawaz Core** : données et services backend
- **Sawaz Pilot** : cockpit interne

Architecture cible : `Sawaz Collect → Sawaz Core ← Sawaz Pilot`

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e03240e5-f416-40c7-844a-978d989b2ee7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to the active project branch on GitHub and your changes sync back into Lovable.

## Development

Prefer working locally? You need Node.js and npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
