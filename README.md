# Application de secrétariat — شركة الصداقة

Application web en français pour créer des courriers en arabe ou en français, personnaliser leurs modèles et dialoguer avec un assistant IA.

## Démarrage

Node.js 22 ou plus récent est requis.

```sh
npm ci
cp .env.example .env
npm start
```

Ouvrir http://localhost:3000. Le serveur écoute sur `0.0.0.0` ; le port peut être réglé avec `PORT`.

## Modèles de lettres

- Trois modèles de départ : lettre officielle, invitation, attestation.
- Styles classique, moderne ou épuré ; police, taille, interligne, marges, alignement, direction RTL/LTR et couleur personnalisables.
- Cliquer sur les zones de texte de la lettre pour modifier l’en-tête, le corps, la signature et le pied de page.
- Le brouillon est sauvegardé automatiquement dans le navigateur. « Enregistrer le modèle » crée une copie nommée, disponible dans « Mes modèles » avec ouverture et suppression.
- Les modèles et le brouillon sont stockés **uniquement dans ce navigateur**, sans compte ni synchronisation. Effacer les données du navigateur les supprime. Évitez les appareils partagés pour les courriers confidentiels.
- « Imprimer / PDF » ouvre l’impression A4 du navigateur. Désactiver les en-têtes/pieds de page du navigateur et sélectionner les couleurs d’arrière-plan si nécessaire. Les courriers longs peuvent occuper plusieurs pages ; les en-têtes ne sont pas répétés.

## Assistant IA et messages vocaux

Renseigner `OPENAI_API_KEY` dans `.env` **sur le serveur**, puis redémarrer. Ne jamais exposer cette clé dans le navigateur ni la versionner. Les modèles sont configurables par `OPENAI_CHAT_MODEL` (défaut : `gpt-4o-mini`) et `OPENAI_TRANSCRIPTION_MODEL` (défaut : `whisper-1`). Un compte API avec accès aux modèles et facturation est nécessaire.

- Le chatbot reçoit le texte du courrier courant et les derniers échanges. Il aide à rédiger, reformuler et traduire. Une réponse peut remplacer le corps du courrier, avec confirmation ; relire le résultat.
- Le microphone exige HTTPS ou localhost et une autorisation du navigateur. Cliquer sur « Message vocal », parler, puis arrêter (maximum 2 minutes).
- Le bouton `+` accepte également un fichier audio WebM, Ogg, MP4, MP3 ou WAV (20 Mo maximum).
- Après consentement, l’audio est envoyé au serveur puis à OpenAI pour transcription. Le texte transcrit apparaît dans le champ de saisie **pour relecture avant envoi au chatbot**.
- Les échanges restent en mémoire dans l’onglet (pas d’historique persistant). Les audios sont traités en mémoire côté serveur, sans écriture sur disque. OpenAI traite les contenus selon ses propres politiques ; n’envoyez pas de données sensibles sans autorisation.
- Sans clé, l’éditeur fonctionne et le chatbot affiche son état non configuré ; aucune réponse IA simulée n’est présentée.

Le serveur déployé doit pouvoir joindre `https://api.openai.com`. L’environnement Arena utilisé pour développer ce projet ne permet pas l’accès sortant à ce domaine : les appels réels n’y sont pas vérifiables.

## Vérification

```sh
npm test
```

Tests HTTP avec fournisseur IA simulé : affichage de l’éditeur, configuration absente, validation des conversations, transcription multipart, rejet de fichiers invalides, erreurs du fournisseur et origines non autorisées.

## Déploiement et sécurité

L’application est une première version mono-utilisateur, sans authentification. Ne pas exposer un serveur avec une clé API sur Internet sans contrôle d’accès (authentification ou passerelle privée) et HTTPS. Une limite simple de 20 requêtes par minute par adresse IP est appliquée en mémoire ; elle ne remplace pas une protection de production, notamment derrière un proxy ou sur plusieurs instances. Ne pas activer aveuglément `trust proxy`.
