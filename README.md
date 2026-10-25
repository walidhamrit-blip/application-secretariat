# السكرتارية — modèles d’origine et IA en ligne

Application arabe de `walidhamrit-blip/secretariat-`, avec ses **9 modèles**, les deux sociétés, logos/en-têtes intégrés, employés, références, archives, recherche, sauvegardes et impression/PDF. L’interface et la lecture restent **de droite à gauche**.

Le texte se modifie directement dans l’aperçu. « تعديل تنسيق النموذج الحالي » règle police, taille, interligne, marges, direction et alignement ; « حفظ التنسيق لهذا النموذج » conserve les réglages par société et modèle. Archiver ou enregistrer en brouillon pour garder les modifications du courrier. « استعادة النص الأصلي من الحقول » restaure le texte généré.

## IA en ligne avec le quota gratuit GroqCloud

Cette version n’utilise plus Ollama, Python, un modèle installé sur le PC, ni une clé OpenAI/Google.

- Chat : `openai/gpt-oss-20b` **hébergé chez Groq**, pas l’API payante OpenAI. Le nom `openai/` désigne l’auteur du modèle.
- Vocaux : `whisper-large-v3-turbo` **chez Groq**, multilingue français/arabe, avec relecture de la transcription avant envoi.
- Compte et clé **Groq** nécessaires. Aucune clé n’est créée ou récupérée par l’application.
- Utiliser le plan **Free** et vérifier les limites du compte avant usage. Le quota gratuit n’est pas illimité et dépend du fournisseur. Aucun basculement automatique vers un fournisseur payant, aucune souscription ni achat de crédit par l’application. Si vous utilisez une clé d’un compte payant, son contrat de facturation s’applique : le code ne peut pas forcer ce compte à devenir gratuit.
- En cas de quota dépassé (HTTP 429), une erreur est affichée ; attendre avant de réessayer. Aucun nouvel essai automatique.

Documentation vérifiée : https://console.groq.com/docs/models, https://console.groq.com/docs/rate-limits, https://console.groq.com/docs/speech-to-text. Les modèles et les offres peuvent évoluer.

## Configurer sur Vercel

1. Créer soi-même un compte gratuit sur https://console.groq.com, puis une clé dans https://console.groq.com/keys. Ne pas partager la clé dans un chat ni dans GitHub.
2. Dans le projet Vercel, **Settings → Environment Variables**, ajouter **`GROQ_API_KEY`** avec la valeur complète, pour Production (et Preview si utilisé).
3. Déployer la branche **`arena/c8365eea-application-secretariat`** de **`walidhamrit-blip/application-secretariat`**. Preset **Other**, racine `./`, aucune commande de build personnalisée. `vercel.json` définit `public` et les routes API Express.
4. Les modèles ont déjà des valeurs par défaut. Facultatif : `GROQ_CHAT_MODEL=openai/gpt-oss-20b` et `GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo`. Les anciennes variables `OPENAI_*`, `GEMINI_*`, `OLLAMA_*` sont ignorées.
5. Redéployer après toute modification de variable, puis tester « Bonjour » et un court vocal. Le statut « clé configurée » ne prouve pas que la clé fonctionne : seule une requête réussie le confirme.

## Exécuter le site sur un PC, mais l’IA sur Internet

Node.js 22 ou plus récent est suffisant ; aucun besoin de Python ni d’Ollama :

```sh
npm ci
cp .env.example .env
# Renseigner GROQ_API_KEY dans .env
npm start
```

Ouvrir http://localhost:3000. Le serveur doit pouvoir joindre `https://api.groq.com`. Les modèles ne sont pas téléchargés sur le PC. `.env` est privé et exclu de Git.

## Microphone et données

HTTPS ou localhost et autorisation du navigateur sont nécessaires pour le microphone. Maximum 2 minutes par enregistrement, 3 Mo par fichier (WebM/Ogg/MP4/MP3/WAV). Le bouton `+` accepte un fichier audio. Après consentement, l’audio est envoyé à Groq pour transcription, puis le texte est relu avant d’être envoyé au chatbot. Les vocaux ne sont pas conservés sur disque côté serveur.

**Le courrier ouvert, les messages et les vocaux choisis sont traités sur Internet par Groq**, selon ses politiques. Ne pas transmettre de données sensibles sans autorisation. La conversation reste en mémoire de l’onglet. Les archives, employés et réglages restent dans le navigateur (`sirr_secretariat_v2`), pas dans une base serveur partagée.

Changer d’adresse, de port ou de navigateur change le stockage : exporter depuis l’ancien site via **الإعدادات → تصدير نسخة احتياطية (JSON)** puis importer dans le nouveau. Exporter régulièrement des sauvegardes.

Le serveur n’a pas d’authentification : protéger l’accès au site, même avec un quota gratuit, pour éviter son épuisement par des visiteurs. La limite mémoire de 20 requêtes/minute/IP n’est ni persistante ni partagée entre instances.

## Vérification

```sh
npm test
```

Tests DOM des modèles, en-têtes, RTL, édition et mise en page ; tests HTTP avec Groq simulé du chatbot, multipart audio, erreurs/quota, origine et taille. L’environnement de développement n’autorise pas l’accès réseau réel à `api.groq.com` : un test après déploiement avec une clé reste nécessaire.
