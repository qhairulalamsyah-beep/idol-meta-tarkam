"""
Image Processor Service
- Convert images to WebP format
- Resize to max width while maintaining aspect ratio
- Compress with high quality settings
- Maintain sharpness using proper resampling
"""

import os
import io
import uuid
import tempfile
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from PIL import Image, ImageFilter

app = FastAPI(title="Image Processor Service")

# Configuration
MAX_WIDTH = 1200  # Max width in pixels
QUALITY = 85  # WebP quality (1-100)
SHARPEN_AMOUNT = 0.3  # Sharpening after resize (0-1)

ALLOWED_TYPES = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_image(image_data: bytes, max_width: int = MAX_WIDTH, quality: int = QUALITY) -> tuple[bytes, int, int]:
    """
    Process image:
    1. Load image
    2. Resize if needed (maintain aspect ratio)
    3. Apply subtle sharpening
    4. Convert to WebP
    
    Returns: (webp_bytes, width, height)
    """
    # Load image from bytes
    img = Image.open(io.BytesIO(image_data))
    
    # Convert to RGB if necessary (for PNG with transparency, etc)
    original_mode = img.mode
    if img.mode in ("RGBA", "P"):
        # Keep alpha channel for WebP
        pass
    elif img.mode != "RGB":
        img = img.convert("RGB")
    
    # Get original dimensions
    original_width, original_height = img.size
    
    # Calculate new dimensions if resize needed
    if original_width > max_width:
        ratio = max_width / original_width
        new_width = max_width
        new_height = int(original_height * ratio)
        
        # Use LANCZOS for high-quality downsampling
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Apply subtle sharpening after resize to maintain detail
        # This compensates for the slight softness from resizing
        if SHARPEN_AMOUNT > 0:
            # Use unsharp mask for better control
            img = img.filter(ImageFilter.UnsharpMask(
                radius=1,
                percent=int(SHARPEN_AMOUNT * 150),
                threshold=3
            ))
    
    # Save to WebP format
    output = io.BytesIO()
    
    # WebP save options
    save_options = {
        "format": "WEBP",
        "quality": quality,
        "method": 4,  # Compression method (0-6, higher = smaller but slower)
    }
    
    # Handle transparency for RGBA images
    if img.mode == "RGBA":
        save_options["lossless"] = False
    
    img.save(output, **save_options)
    output.seek(0)
    
    return output.getvalue(), img.width, img.height


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "image-processor"}


@app.post("/process")
async def process_upload(
    file: UploadFile = File(...),
    max_width: int = Query(MAX_WIDTH, ge=100, le=4000),
    quality: int = Query(QUALITY, ge=50, le=100),
):
    """
    Process uploaded image:
    - Convert to WebP
    - Resize if needed
    - Compress with quality setting
    
    Returns the processed WebP image
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {list(ALLOWED_TYPES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        # Process image
        webp_data, width, height = process_image(content, max_width, quality)
        
        # Generate filename
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.webp"
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(webp_data),
            media_type="image/webp",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "X-Original-Size": str(len(content)),
                "X-Processed-Size": str(len(webp_data)),
                "X-Width": str(width),
                "X-Height": str(height),
                "X-Filename": filename,
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


@app.post("/process-and-save")
async def process_and_save(
    file: UploadFile = File(...),
    folder: str = Query("general", pattern="^[a-zA-Z0-9_-]+$"),
    max_width: int = Query(MAX_WIDTH, ge=100, le=4000),
    quality: int = Query(QUALITY, ge=50, le=100),
):
    """
    Process image and save to disk.
    Returns the file path for serving.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {list(ALLOWED_TYPES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        # Process image
        webp_data, width, height = process_image(content, max_width, quality)
        
        # Create folder
        save_dir = os.path.join(UPLOAD_DIR, folder)
        os.makedirs(save_dir, exist_ok=True)
        
        # Generate filename
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.webp"
        filepath = os.path.join(save_dir, filename)
        
        # Save file
        with open(filepath, "wb") as f:
            f.write(webp_data)
        
        # Return info
        return {
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "url": f"/uploads/{folder}/{filename}",
            "original_size": len(content),
            "processed_size": len(webp_data),
            "compression_ratio": round(len(webp_data) / len(content) * 100, 1) if len(content) > 0 else 0,
            "width": width,
            "height": height,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
