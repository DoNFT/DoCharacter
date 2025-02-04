from fastapi import APIRouter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cryptopunk_constructor.router import router as effect_router
from cryptopunk_constructor.base_effect_router import ipfs_router

router = APIRouter(prefix="/api")
router.include_router(effect_router)
router.include_router(ipfs_router)

app = FastAPI(title="EthCC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Origin"],
)

app.include_router(router)
