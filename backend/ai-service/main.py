import sys
import pathlib
import uvicorn
from app.core.config import settings


if __name__ == "__main__":
    sys.path.insert(
        0,
        str(pathlib.Path(__file__).parent / "app" / "proto" / "generated")
    )

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )