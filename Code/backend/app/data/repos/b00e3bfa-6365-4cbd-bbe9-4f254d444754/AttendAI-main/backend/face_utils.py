"""
face_utils.py — InsightFace (buffalo_l) face detection + 512-dim embedding extraction.

Usage:
    faces = extract_embeddings(image_bytes)
    # → [{"bbox": [x1,y1,x2,y2], "embedding": [...512 floats], "det_score": 0.99}, ...]
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

INSIGHTFACE_ROOT = Path(__file__).resolve().parent / ".insightface"

# Lazy singleton — initialized once on first call
_app: FaceAnalysis | None = None


def get_face_app() -> FaceAnalysis:
    """Return a lazily-initialized InsightFace app using lightweight model for cloud compatibility."""
    global _app
    if _app is None:
        logger.info("Initializing InsightFace model...")
        try:
            # Use buffalo_sc (small, fast, lightweight ~60MB RAM footprint vs 400MB+ for buffalo_l)
            _app = FaceAnalysis(
                name="buffalo_sc",
                root=str(INSIGHTFACE_ROOT),
                providers=["CPUExecutionProvider"],
            )
            _app.prepare(ctx_id=-1, det_size=(640, 640))
            logger.info("InsightFace (buffalo_sc) ready.")
        except Exception as err:
            logger.warning("Could not initialize buffalo_sc, falling back to buffalo_l: %s", err)
            _app = FaceAnalysis(
                name="buffalo_l",
                root=str(INSIGHTFACE_ROOT),
                providers=["CPUExecutionProvider"],
            )
            _app.prepare(ctx_id=-1, det_size=(640, 640))
            logger.info("InsightFace (buffalo_l) ready.")
    return _app


# ─── Image helpers ────────────────────────────────────────────────────────────

def _decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode raw bytes to a BGR numpy array."""
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(
            "Could not decode image. Ensure the file is a valid JPEG, PNG, or BMP."
        )
    return img


def _normalize(vec: np.ndarray) -> np.ndarray:
    """L2-normalize a vector (ArcFace embeddings should already be unit-norm, but be safe)."""
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 1e-10 else vec


# ─── Public API ───────────────────────────────────────────────────────────────

def extract_embeddings(image_bytes: bytes) -> list[dict[str, Any]]:
    """
    Detect all faces in *image_bytes* and return per-face info.

    Returns
    -------
    List of dicts, sorted by detection score descending:
        {
            "bbox":      [x1, y1, x2, y2],   # int, original image pixels
            "embedding": [float × 512],        # L2-normalized ArcFace embedding
            "det_score": float,                # face detection confidence 0–1
        }
    """
    app = get_face_app()
    img = _decode_image(image_bytes)

    faces = app.get(img)
    results: list[dict[str, Any]] = []

    for face in faces:
        bbox      = face.bbox.astype(int).tolist()           # [x1,y1,x2,y2]
        embedding = _normalize(face.embedding).tolist()       # 512-dim, L2-normed
        det_score = float(face.det_score)

        results.append(
            {"bbox": bbox, "embedding": embedding, "det_score": det_score}
        )

    # Best-detected faces first
    results.sort(key=lambda x: x["det_score"], reverse=True)
    return results


def extract_embeddings_from_path(image_path: str) -> list[dict[str, Any]]:
    """Convenience wrapper — read file then call extract_embeddings."""
    with open(image_path, "rb") as fh:
        return extract_embeddings(fh.read())


def get_image_dimensions(image_bytes: bytes) -> tuple[int, int]:
    """Return (width, height) of the decoded image."""
    img = _decode_image(image_bytes)
    h, w = img.shape[:2]
    return w, h
