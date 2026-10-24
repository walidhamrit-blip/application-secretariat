# السكرتارية — Application locale gratuite

Application arabe d’origine de `walidhamrit-blip/secretariat-`, avec ses **9 modèles**, les deux sociétés, les logos et en-têtes intégrés, les employés, la numérotation, les archives, la recherche, les sauvegardes et l’impression/PDF.

L’interface et la lecture sont **de droite à gauche**. Le texte se modifie directement dans l’aperçu. « تعديل تنسيق النموذج الحالي » règle police, taille, interligne, marges et alignement ; « حفظ التنسيق لهذا النموذج » conserve les réglages par société/modèle. Archiver ou enregistrer comme brouillon pour conserver les modifications d’un courrier. « استعادة النص الأصلي من الحقول » revient au texte généré.

## IA gratuite, sur votre ordinateur

- **Ollama**, modèle `qwen2.5:3b` : conversation, rédaction et traduction français/arabe.
- **faster-whisper**, modèle multilingue `small`, CPU int8 : transcription des messages vocaux en local. Ce n’est pas une synthèse vocale.
- Aucune clé API, aucun crédit OpenAI ou Google, aucun abonnement. Le coût matériel/électricité reste à votre charge.
- Internet est nécessaire pour installer les logiciels et télécharger les modèles ; après installation complète, la conversation et la transcription fonctionnent hors ligne. Aucun téléchargement n’est déclenché automatiquement par un message vocal.
- La vitesse et la qualité dépendent du PC. Prévoir plusieurs Go de disque libre ; 8 Go de RAM est un point de départ, 16 Go est préférable, sans garantie de fluidité. Un petit modèle local peut être moins performant qu’un service distant : relire les courriers avant utilisation.

## Installation Windows — une seule fois

1. Installer **Node.js 22 LTS ou plus récent** : https://nodejs.org
2. Installer **Ollama** : https://ollama.com/download/windows et ouvrir l’application.
3. Installer **Python 3.11 ou 3.12 64 bits** : https://www.python.org/downloads/windows/ ; conserver le lanceur `py`.
4. Sur GitHub, sélectionner la branche **`arena/c8365eea-application-secretariat`** du dépôt **`walidhamrit-blip/application-secretariat`**, puis **Code → Download ZIP**. Extraire complètement le ZIP dans un dossier personnel non partagé. Ne pas exécuter depuis l’intérieur du ZIP.
5. Double-cliquer sur **`installer-local.bat`**. Laisser Internet actif et Ollama ouvert. Le script installe les dépendances Node/Python, télécharge `qwen2.5:3b` et Whisper `small`. Plusieurs Go peuvent être téléchargés. S’il affiche une erreur, corriger puis relancer ; ne pas ignorer l’erreur.
6. Une fois l’installation terminée, lancer **`demarrer-local.bat`**, garder sa fenêtre ouverte, et ouvrir **http://localhost:3000**.

Le site n’est pas une page à ouvrir directement par double-clic sur `index.html` : le serveur local est nécessaire pour l’IA. Ce serveur écoute par défaut uniquement sur `127.0.0.1`, sans exposition au réseau. Les modèles ne sont pas adaptés à un hébergement Vercel ; cette version est destinée au PC.

## À chaque utilisation

- Ouvrir Ollama, puis **`demarrer-local.bat`**.
- Ouvrir **http://localhost:3000**. Le port 3000 doit être libre ; ne pas démarrer plusieurs copies.
- Cliquer sur **المساعد الذكي**. Son état vérifie que le modèle Ollama et le moteur vocal sont installés. Après correction d’une installation, fermer et rouvrir le panneau pour revérifier.
- Pour un vocal, autoriser le microphone, parler puis arrêter (2 minutes maximum). Le bouton `+` importe aussi un audio de 3 Mo maximum. La transcription doit être relue avant envoi. Le premier chargement peut être lent ; le délai maximal est de 5 minutes par traitement. Une seule transcription à la fois.
- Fermer la fenêtre serveur pour arrêter le site. Les modèles téléchargés restent sur le disque.

## Sauvegarder et transférer les archives

Les archives sont dans le **navigateur**, avec la clé d’origine `sirr_secretariat_v2`. Une nouvelle adresse web possède un stockage distinct : avant de quitter l’ancien site, utiliser **الإعدادات → تصدير نسخة احتياطية (JSON)**, puis importer cette sauvegarde dans la version locale. Changer de navigateur ou de port change aussi le stockage. Exporter régulièrement les sauvegardes dans un endroit sûr. Ne pas effacer les données du navigateur sans sauvegarde.

La conversation reste en mémoire de l’onglet. Ollama reçoit les messages et le courrier ouvert uniquement sur la boucle locale. Les audios sont écrits dans un fichier temporaire local pour Python puis supprimés après traitement (y compris en cas d’erreur normale ; un arrêt brutal du processus peut laisser un fichier temporaire dans le dossier temporaire du système). Aucun audio n’est envoyé à OpenAI ou Google. Ne pas exposer le serveur sur Internet : il n’a pas d’authentification.

## Installation manuelle (macOS/Linux ou dépannage)

Avec Node.js 22+, Python 3.11/3.12 et Ollama installés :

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-local.txt
ollama pull qwen2.5:3b
.venv/bin/python scripts/transcribe.py --download
npm start
```

Ollama doit déjà être lancé. La transcription utilise PyAV, sans installation manuelle de ffmpeg normalement nécessaire. Les paquets doivent disposer de binaires compatibles avec votre système.

`.env` est facultatif : aucune clé n’est nécessaire. Les anciennes variables `OPENAI_*` et `GEMINI_*` sont ignorées. Options décrites dans `.env.example` : `OLLAMA_MODEL`, `OLLAMA_URL` (HTTP local uniquement), `PYTHON_PATH`, `HOST`, `PORT`. Un autre modèle doit être téléchargé par `ollama pull NOM`, et son nom configuré dans `OLLAMA_MODEL`. Conserver `HOST=127.0.0.1` sur le PC. Les modèles et le venv sont exclus de Git (`.models/`, `.venv/`).

## Vérification

```sh
npm test
python scripts/transcribe.py --check
```

Tests DOM : neuf modèles d’origine, en-têtes, RTL, édition, mise en page et données d’impression. Tests serveur : état réel du moteur local, requêtes Ollama simulées limitées à la boucle locale, audio local simulé, validation et erreurs. Les modèles lourds et les scripts Windows ne sont pas exécutés dans le bac à sable de développement ; un essai réel sur votre PC reste nécessaire.
