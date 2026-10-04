"""Admin image upload. ADMIN role required.

Images are written to settings.UPLOAD_DIR and served read-only from
/api/uploads (mounted in main.py). Only the relative path is returned and
stored, so moving the files to another disk or host never breaks saved pages.

The file is decoded with Pillow rather than trusted by its name or declared
type, and re-saved under a random name, so a renamed script or a mislabelled
file is refused.
"""

import io
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, Form, UploadFile
from PIL import Image, UnidentifiedImageError

from core.config import settings
from core.dependencies import AdminPayload
from core.exceptions import ValidationError
from schemas.common import SuccessResponse

router = APIRouter(prefix="/admin/uploads", tags=["admin"])

MAX_BYTES = 4 * 1024 * 1024  # Vercel caps a request body at 4.5 MB, so stay under it.
FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}

# Minimum size per slot, as (width, height). Smaller images look blurry when
# stretched to the slot. The admin screen shows the same numbers.
MIN_SIZE = {
    "hero": (1600, 500),
    "banner": (800, 270),
}


@router.post("", response_model=SuccessResponse[dict], status_code=201)
async def upload_image(
    _admin: AdminPayload,
    kind: Literal["hero", "banner"] = Form(...),
    file: UploadFile = File(...),
):
    raw = await file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValidationError("Image is larger than 4 MB. Compress it and try again.")
    if not raw:
        raise ValidationError("The file is empty.")

    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
        with Image.open(io.BytesIO(raw)) as img:
            fmt, width, height = img.format, img.width, img.height
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValidationError("That file is not a valid image. Use JPG, PNG or WebP.")

    if fmt not in FORMATS:
        raise ValidationError("Use a JPG, PNG or WebP image.")

    min_w, min_h = MIN_SIZE[kind]
    if width < min_w or height < min_h:
        raise ValidationError(
            f"Image is {width} × {height} px. The minimum is {min_w} × {min_h} px."
        )

    folder = Path(settings.UPLOAD_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{kind}-{uuid.uuid4().hex}.{FORMATS[fmt]}"
    (folder / name).write_bytes(raw)

    return SuccessResponse[dict](
        data={"url": f"/api/uploads/{name}", "width": width, "height": height}
    )
