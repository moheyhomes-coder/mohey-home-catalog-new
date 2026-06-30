from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import asyncio
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Set, List

from fastapi import (
    FastAPI, APIRouter, HTTPException, Request, Response, Depends,
    UploadFile, File, Form, WebSocket, WebSocketDisconnect, Header, Query,
)
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "catalog-live"

storage_key: Optional[str] = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----- WebSocket connection manager -----
class WSManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.discard(ws)


ws_manager = WSManager()


# ----- Password helpers -----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ----- JWT helpers -----
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": user["id"], "email": user["email"], "role": user.get("role", "admin")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----- Storage helpers -----
def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # Re-init and retry once
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                       headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                           headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ----- Models -----
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    role: str

class ColorVariant(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    hex: str = Field(default="#000000", max_length=9)
    image_url: str = ""
    stock: int = Field(ge=0, default=0)

class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)

class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    brand_name: Optional[str] = None

class ItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(ge=0)
    image_url: str = ""
    lifestyle_image_url: str = ""
    category: str = ""
    collection_id: str = ""
    stock: int = Field(ge=0, default=0)
    manual_sold_out: bool = False
    colors: List[ColorVariant] = Field(default_factory=list)

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    lifestyle_image_url: Optional[str] = None
    category: Optional[str] = None
    collection_id: Optional[str] = None
    stock: Optional[int] = None
    manual_sold_out: Optional[bool] = None
    colors: Optional[List[ColorVariant]] = None

class Item(ItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ----- Routes: Auth -----
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=60 * 60 * 24 * 7, path="/",
    )
    return {"id": user["id"], "email": user["email"], "role": user.get("role", "admin"), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserOut)
async def me(current=Depends(get_current_admin)):
    return current


# ----- Items helpers -----
def serialize_item(doc: dict) -> dict:
    doc.pop("_id", None)
    for key in ("created_at", "updated_at"):
        v = doc.get(key)
        if isinstance(v, str):
            try:
                doc[key] = datetime.fromisoformat(v)
            except ValueError:
                pass
    return doc


def is_sold_out(doc: dict) -> bool:
    if doc.get("manual_sold_out"):
        return True
    colors = doc.get("colors") or []
    if colors:
        # If color variants exist, sold-out only when ALL variant stocks are 0
        return all(int(c.get("stock", 0)) <= 0 for c in colors)
    return int(doc.get("stock", 0)) <= 0


async def broadcast_update(event_type: str, item: Optional[dict] = None, item_id: Optional[str] = None):
    msg = {"type": event_type, "ts": datetime.now(timezone.utc).isoformat()}
    if item is not None:
        # Strip datetimes for JSON
        clean = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in item.items()}
        msg["item"] = clean
        msg["public_visible"] = not is_sold_out(item)
    if item_id is not None:
        msg["item_id"] = item_id
    await ws_manager.broadcast(msg)


# ----- Routes: Items -----
@api_router.get("/items")
async def list_items_public():
    items = await db.items.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    visible = [serialize_item(i) for i in items if not is_sold_out(i)]
    return {"items": visible, "updated_at": datetime.now(timezone.utc).isoformat()}


@api_router.get("/admin/items")
async def list_items_admin(current=Depends(get_current_admin)):
    items = await db.items.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [serialize_item(i) for i in items]


@api_router.post("/admin/items")
async def create_item(payload: ItemCreate, current=Depends(get_current_admin)):
    item = Item(**payload.model_dump())
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.items.insert_one(doc)
    out = serialize_item({**doc})
    await broadcast_update("item.created", item=out)
    return out


@api_router.patch("/admin/items/{item_id}")
async def update_item(item_id: str, payload: ItemUpdate, current=Depends(get_current_admin)):
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.items.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = await db.items.find_one({"id": item_id}, {"_id": 0})
    out = serialize_item(doc)
    await broadcast_update("item.updated", item=out)
    return out


@api_router.delete("/admin/items/{item_id}")
async def delete_item(item_id: str, current=Depends(get_current_admin)):
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    await broadcast_update("item.deleted", item_id=item_id)
    return {"ok": True}


# ----- Collections -----
@api_router.get("/collections")
async def list_collections_public():
    rows = await db.collections.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return rows


@api_router.post("/admin/collections")
async def create_collection(payload: CollectionCreate, current=Depends(get_current_admin)):
    col = Collection(name=payload.name.strip())
    doc = col.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.collections.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.delete("/admin/collections/{col_id}")
async def delete_collection(col_id: str, current=Depends(get_current_admin)):
    result = await db.collections.delete_one({"id": col_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Unlink items
    await db.items.update_many({"collection_id": col_id}, {"$set": {"collection_id": ""}})
    return {"ok": True}


# ----- Categories -----
DEFAULT_CATEGORIES = ["bedsheet", "carpet", "doormat", "sofa cover", "quilt", "pouffee"]


@api_router.get("/categories")
async def list_categories_public():
    rows = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return rows


@api_router.post("/admin/categories")
async def create_category(payload: CategoryCreate, current=Depends(get_current_admin)):
    name = payload.name.strip().lower()
    existing = await db.categories.find_one({"name": name})
    if existing:
        existing.pop("_id", None)
        return existing
    cat = Category(name=name)
    doc = cat.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: str, current=Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": cat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


# ----- Settings (WhatsApp number, brand name, etc.) -----
@api_router.get("/settings")
async def get_settings_public():
    doc = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    return {
        "whatsapp_number": doc.get("whatsapp_number", ""),
        "brand_name": doc.get("brand_name", "Mohey Home"),
    }


@api_router.patch("/admin/settings")
async def update_settings(payload: SettingsUpdate, current=Depends(get_current_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Sanitize whatsapp number: keep digits and leading +
    if "whatsapp_number" in update:
        raw = update["whatsapp_number"].strip()
        cleaned = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
        if cleaned and not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        update["whatsapp_number"] = cleaned
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    doc = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    return {
        "whatsapp_number": doc.get("whatsapp_number", ""),
        "brand_name": doc.get("brand_name", "Mohey Home"),
    }


# ----- Routes: Uploads & AI -----
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


@api_router.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), current=Depends(get_current_admin)):
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    ctype = file.content_type or "application/octet-stream"
    if ctype not in ALLOWED_IMAGE_TYPES and not (file.filename or "").lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        raise HTTPException(status_code=400, detail="Only JPG/PNG/WEBP images allowed")
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg").lower()
    path = f"{APP_NAME}/uploads/{current['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, ctype)
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ctype,
        "size": result.get("size"),
        "uploaded_by": current["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    public_url = f"/api/files/{result['path']}"
    return {"path": result["path"], "url": public_url}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    """Public file serving — catalog images need to be visible to everyone."""
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(
        content=data,
        media_type=record.get("content_type", content_type),
        headers={"Cache-Control": "public, max-age=86400"},
    )


# ----- WebSocket -----
@api_router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        await ws.send_json({"type": "hello", "ts": datetime.now(timezone.utc).isoformat()})
        while True:
            # Keep alive; ignore client messages
            try:
                await asyncio.wait_for(ws.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await ws.send_json({"type": "ping", "ts": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
    except Exception:
        ws_manager.disconnect(ws)


@api_router.get("/")
async def root():
    return {"message": "Catalog API", "ws": "/api/ws"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@catalog.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    # Remove any stale admin users not matching configured email
    await db.users.delete_many({"email": {"$ne": admin_email}})
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Updated admin password")
    await db.users.create_index("email", unique=True)
    await db.items.create_index("created_at")
    await db.files.create_index("storage_path")
    await db.categories.create_index("name", unique=True)
    # Seed default categories if collection is empty
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        for name in DEFAULT_CATEGORIES:
            await db.categories.insert_one({
                "id": str(uuid.uuid4()),
                "name": name,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        logger.info(f"Seeded {len(DEFAULT_CATEGORIES)} default categories")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
