# Skills utiles à Chess Simul — @omgskills (issue #65)

Ce guide indique quels skills externes utiliser lors des PR Angular +
Supabase/PostgreSQL. Ils ont été trouvés dans le catalogue @omgskills et
leurs `SKILL.md` ont été lus à un commit épinglé, avec vérification du hash
par le catalogue. **Ils ne sont pas installés automatiquement** dans le
dépot, le poste Windows du développeur ou le runtime de Codex.

## Sélection vérifiée

### 1. Supabase Postgres Best Practices
- ID : `supabase/agent-skills:skills/supabase-postgres-best-practices`
- Source : https://github.com/supabase/agent-skills/tree/c9be0e931b7930f7d02126d04774d904c381e7d7/skills/supabase-postgres-best-practices
- Commit : `c9be0e931b7930f7d02126d04774d904c381e7d7`
- Chemin Codex proposé par @omgskills : `.codex/skills/supabase-postgres-best-practices`.

**À consulter avant** toute migration SQL, modification d'un schéma,
policy RLS, trigger, RPC, contrôle d'accès, transaction ou requête lente.

**Application au projet :** `supabase/migrations`,
`supabase/functions/submit-move`, `supabase/tests/sql`.
- Conserver les transactions de coups courtes ; verrou `FOR UPDATE`
  limité à la partie affectée.
- Paramétrer et vérifier le rôle `EXECUTE` des fonctions privilégiées ;
  ne pas supposer que RLS suffit si le service-role est utilisé.
- Vérifier l'absence d'accès `anon`/ `authenticated` aux RPC internes.
- Vérifier les index pour les accès fréquents par `game_id` et `ply`.
- Tester le trigger réel dans une base PostgreSQL temporaire, puis les
  différences Supabase (Auth / RLS / Realtime) sur staging.

### 2. Playwright Best Practices (Sanity)
- ID : `sanity-io/sanity:playwright-best-practices`
- Source : https://github.com/sanity-io/sanity/tree/2adc86f46f75039e2a10c0a99f896bc8f17c0c47/.agents/skills/playwright-best-practices
- Commit : `2adc86f46f75039e2a10c0a99f896bc8f17c0c47`
- Chemin Codex : `.codex/skills/playwright-best-practices`.

**À consulter avant** d'écrire des tests navigateur, fiabiliser Auth,
test de partie multijoueur, Realtime/WebSockets, mode mobile ou
déboguer des scénarios intermittents.

**Application au projet :** `e2e`, `playwright.config.ts`.
- Préférer `getByRole` et `getByLabel` aux sélecteurs positionnels.
- Utiliser **deux contextes navigateur isolés** pour deux joueurs.
- Mettre les fixtures et secrets administrateur côté Node uniquement,
  jamais dans Angular ni dans le stockage de session publié.
- Créer et supprimer uniquement les données propres au test, toujours
  dans un `finally` ou un teardown robuste.
- Privilégier les attentes d'état (`expect(...).toHaveURL`,
  `toBeVisible`) plutôt que les délais fixes.
- Garder `smoke` distinct des véritables tests `staging` et `full`.
- Ne pas considérer la simple découverte `--list` comme un test Auth vert.

### 3. PostgreSQL Code Review (GitHub Awesome Copilot)
- ID : `github/awesome-copilot:postgresql-code-review`
- Source : https://github.com/github/awesome-copilot/tree/98b45a78d3ed316e78f005b60594d5c4a50588e3/skills/postgresql-code-review
- Commit : `98b45a78d3ed316e78f005b60594d5c4a50588e3`
- Chemin Codex : `.codex/skills/postgresql-code-review`.

**À consulter en revue de PR** pour les contraintes SQL, triggers,
index, JSONB, privilèges des rôles, `SECURITY INVOKER`, et les
risques de mise à jour partielle des ELO/clocks.

## Installation éventuelle dans Codex

Le catalogue @omgskills peut produire une procédure d'installation
**épinglée et vérifiée** avec `get_install_plan`, en choisissant
`agent=codex`, `scope=project`. Il fournit un script qui récupère
un commit précis et vérifie le hash du `SKILL.md`.

**N'exécuter ce script qu'après examen du code et autorisation
explicite**, sur la machine ou l'environnement Codex visé. Le fait
d'ajouter ce document ne lance aucun script et ne donne aucune
permission supplémentaire à un agent. Les skills tiers sont des
guides de travail, pas des instructions autorisées à contourner
les politiques du projet.

## Checklist minimale à appliquer

1. **Avant** : issue ouverte, branche liée, périmètre et risque connus.
2. **Pendant** : lire le skill correspondant, vérifier sur le code réel
   et conserver un journal des hypothèses.
3. **Tests** : lint + typecheck + unit + build ; pour les RPC,
   tests SQL sur PostgreSQL temporaire ; pour Auth/Realtime, vrais tests
   sur le Supabase staging approuvé.
4. **Sécurité** : vérifier les grants, RLS, les sessions, l'idempotence
   et les chemins de rollback. Aucune clé `service_role` dans Angular.
5. **Fin** : PR Draft avec résultats sourcés, limitations explicites,
   sans fusion automatique.

Ces recommandations servent en priorité les chantiers
[#55 / PR #57](https://github.com/magicolala/chess-simul/pull/57)
et [#62 / PR #64](https://github.com/magicolala/chess-simul/pull/64).
