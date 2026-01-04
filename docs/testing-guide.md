# Guide de Test Complet - Chess Simul

Guide complet pour l'utilisation de la suite de tests automatisés de chess-simul.

## 📚 Table des Matières

1. [Tests Unitaires](#tests-unitaires)
2. [Tests E2E](#tests-e2e)
3. [Couverture de Code](#couverture-de-code)
4. [Tests d'Accessibilité](#tests-daccessibilité)
5. [Tests de Performance](#tests-de-performance)
6. [Tests de Régression Visuelle](#tests-de-régression-visuelle)
7. [CI/CD](#cicd)

---

## Tests Unitaires

### Exécution

```bash
# Tous les tests unitaires
npm run test:unit --workspace=web

# Mode watch (développement)
npm run test:unit --workspace=web -- --watch

# Tests spécifiques
npm run test:unit --workspace=web -- auth.service.spec.ts
```

### Structure

Les tests unitaires se trouvent dans `apps/web/src/**/*.spec.ts` et utilisent **Vitest** avec **Angular Testing Library**.

---

## Tests E2E

### Exécution

```bash
# Tous les tests E2E
npm run test:e2e --workspace=web

# Interface UI (recommandé)
npm run test:e2e:ui --workspace=web

# Mode debug
npm run test:e2e:debug --workspace=web

# Tests spécifiques
npm run test:e2e --workspace=web -- auth.spec.ts
```

### Navigateurs

Les tests s'exécutent sur :
- Chrome (Desktop & Mobile)
- Firefox
- Safari (Desktop & Mobile)

---

## Couverture de Code

### Exécution

```bash
npm run test:coverage --workspace=web
```

### Seuils Minimaux

- **Lignes** : 70%
- **Fonctions** : 70%
- **Branches** : 65%
- **Statements** : 70%

### Rapports

Les rapports sont générés dans `apps/web/coverage/` :
- `index.html` : Rapport HTML interactif
- `lcov.info` : Format LCOV pour CI/CD

---

## Tests d'Accessibilité

### Exécution

```bash
npm run test:a11y --workspace=web
```

### Standards

Tests de conformité **WCAG 2.1 AA** avec axe-core :
- Contraste des couleurs
- Labels de formulaires
- Navigation au clavier
- Attributs ARIA
- Ordre des titres
- Textes alternatifs

### Ajout de Nouveaux Tests

```typescript
test('my component should be accessible', async ({ page }) => {
  await page.goto('/my-component');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

---

## Tests de Performance

### Lighthouse CI

```bash
# Installation globale
npm install -g @lhci/cli

# Exécution locale
lhci autorun
```

### Seuils Minimaux

- **Performance** : 80%
- **Accessibilité** : 90%
- **Best Practices** : 85%
- **SEO** : 85%

### Métriques Clés

- First Contentful Paint < 2s
- Time to Interactive < 3.5s
- Speed Index < 3s
- Cumulative Layout Shift < 0.1

---

## Tests de Régression Visuelle

### Exécution

```bash
# Comparer avec les baselines
npm run test:visual --workspace=web

# Mettre à jour les baselines
npm run test:visual:update --workspace=web
```

### Création de Baselines

La première exécution crée automatiquement les screenshots de référence dans `e2e/**/*.spec.ts-snapshots/`.

### Ajout de Nouveaux Tests

```typescript
test('my component should match snapshot', async ({ page }) => {
  await page.goto('/my-component');
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('my-component.png', {
    fullPage: true,
    maxDiffPixels: 100
  });
});
```

---

## CI/CD

### GitHub Actions

Deux workflows automatisés :

#### 1. Tests (`test.yml`)

Déclenché sur push/PR vers `main` ou `develop` :
- ✅ Tests unitaires
- ✅ Couverture de code
- ✅ Tests E2E
- ✅ Lint & Type check
- ✅ Upload vers Codecov

#### 2. Lighthouse (`lighthouse.yml`)

Déclenché sur push/PR vers `main` :
- ✅ Build de production
- ✅ Audit Lighthouse
- ✅ Vérification des seuils

### Configuration Codecov

Ajoutez `CODECOV_TOKEN` dans les secrets GitHub pour l'upload automatique de la couverture.

### Configuration Lighthouse

Pour les rapports persistants, configurez `LHCI_GITHUB_APP_TOKEN` dans les secrets GitHub.

---

## Bonnes Pratiques

### Tests Unitaires

1. **Isoler les dépendances** : Utiliser des mocks pour les services externes
2. **Tester les cas limites** : Valeurs nulles, erreurs, timeouts
3. **Nommer clairement** : Descriptions explicites des tests
4. **Un concept par test** : Tests focalisés et maintenables

### Tests E2E

1. **Utiliser des sélecteurs robustes** : Préférer `data-testid` aux classes CSS
2. **Attendre les états** : `waitForLoadState`, `waitForSelector`
3. **Isoler les tests** : Chaque test doit être indépendant
4. **Nettoyer après** : Supprimer les données de test créées

### Accessibilité

1. **Tester tôt** : Intégrer les tests a11y dès le début
2. **Navigation clavier** : Vérifier Tab, Enter, Esc
3. **Screen readers** : Tester avec NVDA/JAWS si possible
4. **Contraste** : Utiliser des outils comme Contrast Checker

### Performance

1. **Optimiser les images** : WebP, lazy loading
2. **Code splitting** : Charger le code à la demande
3. **Caching** : Service workers, HTTP caching
4. **Minimiser JS/CSS** : Build optimisé pour production

---

## Dépannage

### Tests E2E Échouent Localement

```bash
# Réinstaller les navigateurs
npx playwright install --with-deps

# Vérifier que le serveur est démarré
npm run dev
```

### Couverture Insuffisante

```bash
# Voir les fichiers non couverts
npm run test:coverage --workspace=web

# Ouvrir le rapport HTML
open apps/web/coverage/index.html
```

### Screenshots Ne Correspondent Pas

```bash
# Mettre à jour les baselines
npm run test:visual:update --workspace=web

# Comparer visuellement
npm run test:e2e:ui --workspace=web
```

---

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
