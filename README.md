# نظام المراسلات والأرشفة — السكرتارية

Application arabe d’origine restaurée depuis `walidhamrit-blip/secretariat-` (fichier `index.html`), enrichie sans remplacer les modèles. Les polices, logos, en-têtes et pieds de page d’origine sont intégrés dans le HTML.

## Fonctionnalités conservées

- Deux sociétés : الصداقة المثالية (alimentaire AIS et matériaux AIS-BM).
- Les **9 modèles d’origine** : travail, salaire, ancienneté, fin de service, mission, congé, note interne, correspondance officielle et texte libre.
- Tableau de bord, employés, références, archives locales, recherche, export/import de sauvegarde, modèles de papier à en-tête et impression/PDF.
- Interface arabe et lecture **de droite à gauche**.

## Ajouts sur les modèles existants

Dans « خطاب جديد », choisir un modèle d’origine puis ouvrir **« تعديل تنسيق النموذج الحالي »** : taille/police, interligne, marges, alignement et direction. L’aperçu et l’impression utilisent les mêmes réglages. « حفظ التنسيق لهذا النموذج » mémorise les réglages par société et par modèle sans remplacer sa papeterie.

Cliquer directement dans le corps du courrier dans l’aperçu pour modifier son texte. Le texte devient alors une version manuelle, indépendante des champs ; « استعادة النص الأصلي من الحقول » restaure le texte généré. **Archiver ou enregistrer comme brouillon** pour conserver le texte et ses réglages avec le courrier. Les en-têtes et pieds de page se modifient toujours dans la rubrique sociétés/papeterie d’origine.

L’assistant OpenAI est disponible via le bouton **المساعد الذكي** : messages écrits, microphone (HTTPS/localhost, autorisation requise, 2 minutes maximum), import audio (WebM/Ogg/MP4/MP3/WAV, **3 Mo maximum**), transcription à relire avant envoi, application d’une réponse au corps du courrier après confirmation. La réponse ne remplace jamais les en-têtes ni le modèle.

## Installation

Node.js 22 ou plus récent :

```sh
npm ci
cp .env.example .env
npm start
```

Ouvrir http://localhost:3000. Le serveur écoute sur `0.0.0.0`. Ajouter une clé API OpenAI à `OPENAI_API_KEY` dans `.env` pour activer l’assistant. Modèles configurables : `OPENAI_CHAT_MODEL=gpt-4o-mini` et `OPENAI_TRANSCRIPTION_MODEL=whisper-1`. Ne jamais partager ou versionner la clé.

## Vercel

- Dépôt : **walidhamrit-blip/application-secretariat**, branche **arena/c8365eea-application-secretariat**.
- Preset **Other**, racine `./`, sans commande de build personnalisée. `vercel.json` définit `public` comme sortie statique et `/api/*` vers la fonction Express.
- Ajouter `OPENAI_API_KEY` aux variables d’environnement du projet pour Production et éventuellement Preview, puis redéployer.
- L’accès réseau à `api.openai.com` et un crédit API OpenAI disponible sont requis. Les appels réels ne sont pas vérifiables dans le réseau restreint de cet environnement de développement.

## Données et confidentialité

L’application déployée ici utilise **l’archivage local du navigateur**, pas le serveur Python d’archives partagées du dépôt d’origine. Les données ne sont ni synchronisées ni transférées automatiquement entre les adresses web. Avant de quitter l’ancien site, utiliser **الإعدادات → تصدير نسخة احتياطية (JSON)**, puis importer cette sauvegarde dans la nouvelle application. La clé de stockage d’origine `sirr_secretariat_v2` est conservée pour une mise à jour sur la même origine. Les images personnelles restent dans les sauvegardes locales.

Le courrier ouvert et les messages envoyés sont transmis à OpenAI ; après consentement, les audios sont également transmis pour transcription. Les conversations restent en mémoire dans l’onglet ; le serveur ne conserve pas les audios sur disque. Les politiques et quotas OpenAI s’appliquent. Ne pas transmettre de données sensibles sans autorisation.

Cette version n’a pas d’authentification serveur pour l’IA : protéger son accès avant de l’exposer avec une clé payante. Le limiteur en mémoire de 20 requêtes/minute/IP n’est pas une protection de production et n’est pas partagé entre instances Vercel.

## Vérification

```sh
npm test
```

Tests HTTP avec OpenAI simulé et test DOM de l’application restaurée : neuf modèles, en-têtes intégrés, RTL, édition directe, mise en page, persistance des réglages, données d’impression, validation audio, erreurs et quotas.

## Passage de Gemini à OpenAI

Le chatbot et la transcription utilisent désormais exclusivement OpenAI. Les modèles de lettres, les données locales, la mise en page et le RTL sont inchangés. Les anciennes variables `GEMINI_API_KEY` et `GEMINI_MODEL` ne sont plus lues et peuvent être retirées de Vercel.

Créer une clé sur https://platform.openai.com/api-keys et la saisir uniquement dans `OPENAI_API_KEY` côté serveur (Production et Preview si nécessaire), puis redéployer. Ne pas utiliser une clé Google. Une facturation API active est nécessaire : l’abonnement ChatGPT ne fournit pas de crédit API. Les modèles par défaut sont définis dans le code ; les deux variables de modèles sont facultatives.
