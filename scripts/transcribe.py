"""Local CPU transcription. Downloads are explicit, never triggered by an audio upload."""
import json
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / '.models' / 'whisper-small'


def main():
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        if '--check' in sys.argv:
            print(json.dumps({'installed': False, 'downloaded': False}))
            return
        raise RuntimeError('Installez les dependances Python avec installer-local.bat.')
    if '--check' in sys.argv:
        print(json.dumps({'installed': True, 'downloaded': (MODEL_DIR / 'model.bin').is_file()}))
        return
    if '--download' in sys.argv:
        from faster_whisper.utils import download_model
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        download_model('small', output_dir=str(MODEL_DIR))
        print('Modele Whisper small telecharge. Le vocal fonctionnera sans connexion.')
        return
    if not (MODEL_DIR / 'model.bin').is_file():
        raise RuntimeError('Telechargez Whisper avec python scripts/transcribe.py --download.')
    if len(sys.argv) != 2:
        raise RuntimeError('Un fichier audio est requis.')
    model = WhisperModel(str(MODEL_DIR), device='cpu', compute_type='int8', local_files_only=True)
    segments, _ = model.transcribe(sys.argv[1], beam_size=5, vad_filter=True, task='transcribe')
    print(json.dumps({'text': ' '.join(segment.text.strip() for segment in segments)}, ensure_ascii=True))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Do not print document contents or the user's filesystem paths.
        print(json.dumps({'error': 'Transcription indisponible : verifiez le modele, les dependances et le fichier audio.'}))
        sys.exit(1)
