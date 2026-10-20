import os
from pathlib import Path
from insightface.app import FaceAnalysis

def download():
    root_dir = Path(__file__).resolve().parent / ".insightface"
    print(f"Downloading InsightFace models to: {root_dir}")
    root_dir.mkdir(exist_ok=True)
    
    # Pre-download buffalo_sc
    print("Initializing buffalo_sc...")
    app_sc = FaceAnalysis(name="buffalo_sc", root=str(root_dir))
    app_sc.prepare(ctx_id=-1)
    
    # Pre-download buffalo_l (as fallback)
    print("Initializing buffalo_l...")
    app_l = FaceAnalysis(name="buffalo_l", root=str(root_dir))
    app_l.prepare(ctx_id=-1)
    
    print("Models downloaded successfully.")

if __name__ == "__main__":
    download()
