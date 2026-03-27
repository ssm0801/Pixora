"""
Thumbnail generator — Python 3.12 / Pillow

Triggered by S3 ObjectCreated on the media/ prefix.
Writes a 400×400 JPEG to thumbnails/{same relative key}.jpg

Images:  Pillow LANCZOS resize → JPEG quality 82
Videos:  FFmpeg first-frame extraction (subprocess) → Pillow resize
         Falls back to a grey placeholder if /opt/bin/ffmpeg is not present.
"""

import io
import logging
import os
import subprocess
import tempfile
import urllib.parse

import boto3
from PIL import Image

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")

BUCKET     = os.environ["BUCKET_NAME"]
THUMB_SIZE = int(os.environ.get("THUMB_SIZE", "400"))
FFMPEG     = os.environ.get("FFMPEG_PATH", "/opt/bin/ffmpeg")

VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".3gp"}


def handler(event, _context):
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key    = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        if not key.startswith("media/"):
            continue

        try:
            _process(bucket, key)
        except Exception:
            logger.exception("Failed to generate thumbnail for %s", key)


def _process(bucket: str, key: str) -> None:
    # key:       eventId/media/uuid.ext
    # thumb_key: eventId/thumbnail/uuid.jpg
    if '/media/' not in key:
        logger.info("Skipping non-media key: %s", key)
        return

    stem       = os.path.splitext(key)[0]            # eventId/media/uuid
    thumb_key  = stem.replace('/media/', '/thumbnail/') + '.jpg'

    ext = os.path.splitext(key)[1].lower()
    is_video   = ext in VIDEO_EXTS

    if is_video:
        img = _video_thumbnail(bucket, key)
    else:
        img = _image_thumbnail(bucket, key)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82, optimize=True)
    buf.seek(0)

    s3.put_object(
        Bucket=bucket,
        Key=thumb_key,
        Body=buf,
        ContentType="image/jpeg",
    )
    logger.info("Written %s → %s", key, thumb_key)


# ── Image ─────────────────────────────────────────────────────────────────────

def _image_thumbnail(bucket: str, key: str) -> Image.Image:
    obj  = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read()
    img  = Image.open(io.BytesIO(data)).convert("RGB")
    return _crop_square(img, THUMB_SIZE)


# ── Video ─────────────────────────────────────────────────────────────────────

def _video_thumbnail(bucket: str, key: str) -> Image.Image:
    if not os.path.isfile(FFMPEG):
        logger.warning("FFmpeg not found at %s — returning placeholder", FFMPEG)
        return _grey_placeholder(THUMB_SIZE)

    obj  = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read()

    with tempfile.TemporaryDirectory() as tmp:
        src  = os.path.join(tmp, "input" + os.path.splitext(key)[1])
        out  = os.path.join(tmp, "frame.jpg")

        with open(src, "wb") as f:
            f.write(data)

        result = subprocess.run(
            [
                FFMPEG, "-y",
                "-ss", "0",
                "-i", src,
                "-vframes", "1",
                "-q:v", "2",
                out,
            ],
            capture_output=True,
            timeout=20,
        )

        if result.returncode != 0 or not os.path.isfile(out):
            logger.warning(
                "FFmpeg failed (rc=%d): %s",
                result.returncode,
                result.stderr.decode(errors="replace")[:200],
            )
            return _grey_placeholder(THUMB_SIZE)

        img = Image.open(out).convert("RGB")
        return _crop_square(img, THUMB_SIZE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _crop_square(img: Image.Image, size: int) -> Image.Image:
    """Centre-crop to a square, then resize to size×size."""
    w, h  = img.size
    side  = min(w, h)
    left  = (w - side) // 2
    top   = (h - side) // 2
    img   = img.crop((left, top, left + side, top + side))
    return img.resize((size, size), Image.LANCZOS)


def _grey_placeholder(size: int) -> Image.Image:
    """Solid grey image used when FFmpeg is unavailable."""
    return Image.new("RGB", (size, size), color=(180, 180, 180))
