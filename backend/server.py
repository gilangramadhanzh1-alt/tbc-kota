from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool
import uuid
from urllib.parse import quote
from storage import init_storage, put_object, get_object, APP_NAME
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
JWT_ALG = "HS256"

INDICATORS = [
    {"id": "spm_terduga", "no": 1, "name": "SPM Terduga TBC", "code": "SPM-TB"},
    {"id": "treatment_coverage", "no": 2, "name": "Treatment Coverage", "code": "TC"},
    {"id": "enrollment_tb_so", "no": 3, "name": "Enrollment TB SO", "code": "ENR-SO"},
    {"id": "keberhasilan_pengobatan", "no": 4, "name": "Keberhasilan Pengobatan", "code": "SR-SO"},
    {"id": "penemuan_kasus_tb_ro", "no": 5, "name": "Penemuan Kasus TB RO", "code": "CASE-RO"},
    {"id": "enrollment_tb_ro", "no": 6, "name": "Enrollment TB RO", "code": "ENR-RO"},
    {"id": "keberhasilan_tb_ro", "no": 7, "name": "Keberhasilan TB RO", "code": "SR-RO"},
    {"id": "tbc_anak", "no": 8, "name": "TBC Anak", "code": "TB-ANAK"},
    {"id": "tbc_hiv", "no": 9, "name": "TBC HIV", "code": "TB-HIV"},
    {"id": "tpt", "no": 10, "name": "TPT", "code": "TPT"},
    {"id": "ik_bakteriologis", "no": 11, "name": "Investigasi Kontak Bakteriologis", "code": "IK-BAKT"},
    {"id": "ik_klinis", "no": 12, "name": "Investigasi Kontak Klinis", "code": "IK-KLIN"},
]
INDICATOR_IDS = {i["id"] for i in INDICATORS}
KELURAHAN_INDICATORS = {"treatment_coverage", "penemuan_kasus_tb_ro"}
LUAR_KOTA_INDICATORS = {"treatment_coverage", "penemuan_kasus_tb_ro"}
LUAR_KOTA_ID = "luar_kota"


def indicators_for(unit_type):
    return [i for i in INDICATORS if unit_type == "faskes" or i["id"] in KELURAHAN_INDICATORS]

KELURAHAN = ["JAYAKARSA", "BAROS", "JAYA MEKAR", "SUDAJAYA HILIR", "BENTENG", "DAYEUHLUHUR", "CIBEUREUM HILIR",
             "BABAKAN", "CIKUNDUL", "CIPANENGAH", "SINDANG SARI", "GUNUNG PUYUH", "SRIWIDARI", "CITAMIANG",
             "GEDONG PANJANG", "KARAMAT", "KARANG TENGAH", "LEMBURSITU", "SITU MEKAR", "LIMUSNUNGGAL",
             "SINDANG PALAY", "NANGGELENG", "WARUDOYONG", "NYOMPLONG", "CIKOLE", "GUNUNG PARANG", "SELABATU",
             "SUKAKARYA", "TIPAR", "CIKONDANG", "KEBONJATI", "CISARUA", "SUBANGJAYA"]
FASKES = ["PUSKESMAS BAROS", "PUSKESMAS BENTENG", "PUSKESMAS CIBEUREUM HILIR", "PUSKESMAS CIKUNDUL",
          "PUSKESMAS CIPELANG", "PUSKESMAS GEDONG PANJANG", "PUSKESMAS KARANG TENGAH", "PUSKESMAS LEMBUR SITU",
          "PUSKESMAS LIMUSNUNGGAL", "PUSKEMAS NANGGELENG", "PUSKESMAS PABUARAN", "PUSKESMAS SELABATU",
          "PUSKESMAS SUKAKARYA", "PUSKESMAS TIPAR", "PUSKESMAS SUKABUMI", "RS SYAMSUDIN", "RS BAYANGKARA",
          "RS ASSYIFA", "RS RIDHOGALIH", "RS AL-MULK", "RS KARTIKA", "DPM DR JEFFRY", "LAPAS",
          "Klinik Satkes Setukpa", "KLINIK3R"]

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]
UnitType = Literal["kelurahan", "faskes"]
PeriodType = Literal["bulan", "triwulan", "semester", "tahunan"]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude={"id"})
        d.pop("_id", None)
        return d


class Unit(BaseDocument):
    name: str
    type: UnitType
    order: int = 0


class UnitIn(BaseModel):
    name: str = Field(min_length=1)
    type: UnitType
    order: int = 0


class InputRow(BaseModel):
    unit_id: str
    target_angka: float = Field(default=0, ge=0)
    target_persen: float = Field(default=100, ge=0)
    months: List[float] = Field(min_length=12, max_length=12)


class InputPayload(BaseModel):
    indicator: str
    year: int
    rows: List[InputRow]


class LoginIn(BaseModel):
    email: str
    password: str


def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h): return bcrypt.checkpw(p.encode(), h.encode())


def create_token(uid, email):
    payload = {"sub": uid, "email": email, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


async def current_admin(request: Request):
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Belum login")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sesi berakhir, silakan login ulang")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token tidak valid")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or user.get("role") != "admin":
        raise HTTPException(401, "Akses ditolak")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name"), "role": user["role"]}


def period_months(ptype: str, idx: int) -> List[int]:
    if ptype == "bulan":
        if not 1 <= idx <= 12: raise HTTPException(400, "Bulan tidak valid")
        return [idx]
    if ptype == "triwulan":
        if not 1 <= idx <= 4: raise HTTPException(400, "Triwulan tidak valid")
        return list(range((idx - 1) * 3 + 1, idx * 3 + 1))
    if ptype == "semester":
        if not 1 <= idx <= 2: raise HTTPException(400, "Semester tidak valid")
        return list(range((idx - 1) * 6 + 1, idx * 6 + 1))
    return list(range(1, 13))


def pct(a, b): return round(a / b * 100, 2) if b else 0.0


def check_indicator(ind):
    if ind not in INDICATOR_IDS: raise HTTPException(404, "Indikator tidak ditemukan")


async def build_report(indicator, year, unit_type, months):
    units = [Unit.from_mongo(u) for u in await db.units.find({"type": unit_type}).sort([("order", 1), ("name", 1)]).to_list(500)]
    targets = {t["unit_id"]: t for t in await db.targets.find({"indicator": indicator, "year": year}).to_list(1000)}
    cap = {}
    async for c in db.capaian.find({"indicator": indicator, "year": year, "month": {"$in": months}}):
        cap[c["unit_id"]] = cap.get(c["unit_id"], 0) + c["value"]
    factor = len(months) / 12
    rows, tot_t, tot_c, tot_annual, tp_list = [], 0.0, 0.0, 0.0, []
    for u in units:
        t = targets.get(u.id, {})
        annual = t.get("target_angka", 0)
        tp = t.get("target_persen", 100)
        tgt = round(annual * factor, 2)
        c = cap.get(u.id, 0)
        cp = pct(c, tgt)
        rows.append({"unit_id": u.id, "unit_name": u.name, "target_tahunan": annual, "target_angka": tgt,
                     "target_persen": tp, "capaian_angka": c, "capaian_persen": cp,
                     "tercapai": tgt > 0 and cp >= tp})
        tot_t += tgt; tot_c += c; tot_annual += annual
        if annual: tp_list.append(tp)
    if indicator in LUAR_KOTA_INDICATORS:
        c = cap.get(LUAR_KOTA_ID, 0)
        rows.append({"unit_id": LUAR_KOTA_ID, "unit_name": "LUAR KOTA", "target_tahunan": 0, "target_angka": 0,
                     "target_persen": 0, "capaian_angka": c, "capaian_persen": 0, "tercapai": False, "luar_kota": True})
        tot_c += c
    total_tp = round(sum(tp_list) / len(tp_list), 2) if tp_list else 100
    total = {"target_tahunan": tot_annual, "target_angka": round(tot_t, 2), "target_persen": total_tp,
             "capaian_angka": tot_c, "capaian_persen": pct(tot_c, tot_t)}
    total["tercapai"] = tot_t > 0 and total["capaian_persen"] >= total_tp
    return rows, total


@api.get("/")
async def root(): return {"message": "Data TBC Kota Sukabumi"}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.strip().lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if att and att.get("count", 0) >= 5 and att.get("locked_until") and att["locked_until"].replace(tzinfo=timezone.utc) > now:
        raise HTTPException(429, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att.get("count", 0) if att else 0) + 1
        await db.login_attempts.update_one({"identifier": ident}, {"$set": {"count": count, "locked_until": now + timedelta(minutes=15) if count >= 5 else None}}, upsert=True)
        raise HTTPException(401, "Email atau password salah")
    await db.login_attempts.delete_many({"identifier": ident})
    token = create_token(str(user["_id"]), email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"token": token, "user": {"id": str(user["_id"]), "email": email, "name": user.get("name"), "role": user["role"]}}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(current_admin)): return user


@api.get("/indicators")
async def indicators(unit_type: Optional[UnitType] = None): return indicators_for(unit_type or "faskes")


@api.get("/units")
async def list_units(type: Optional[UnitType] = None):
    q = {"type": type} if type else {}
    docs = await db.units.find(q).sort([("type", 1), ("order", 1), ("name", 1)]).to_list(1000)
    return [Unit.from_mongo(d).model_dump() for d in docs]


@api.post("/units")
async def create_unit(body: UnitIn, _=Depends(current_admin)):
    name = " ".join(body.name.split())
    if await db.units.find_one({"type": body.type, "name": name}):
        raise HTTPException(400, "Nama sudah ada")
    u = Unit(name=name, type=body.type, order=body.order)
    res = await db.units.insert_one(u.to_mongo())
    u.id = str(res.inserted_id)
    return u.model_dump()


@api.put("/units/{uid}")
async def update_unit(uid: str, body: UnitIn, _=Depends(current_admin)):
    res = await db.units.update_one({"_id": ObjectId(uid)}, {"$set": {"name": " ".join(body.name.split()), "order": body.order}})
    if not res.matched_count: raise HTTPException(404, "Data tidak ditemukan")
    return Unit.from_mongo(await db.units.find_one({"_id": ObjectId(uid)})).model_dump()


@api.delete("/units/{uid}")
async def delete_unit(uid: str, _=Depends(current_admin)):
    res = await db.units.delete_one({"_id": ObjectId(uid)})
    if not res.deleted_count: raise HTTPException(404, "Data tidak ditemukan")
    await db.targets.delete_many({"unit_id": uid})
    await db.capaian.delete_many({"unit_id": uid})
    return {"ok": True}


@api.get("/report")
async def report(indicator: str, year: int, unit_type: UnitType = "kelurahan",
                 period_type: PeriodType = "tahunan", period_index: int = 1):
    check_indicator(indicator)
    rows, total = await build_report(indicator, year, unit_type, period_months(period_type, period_index))
    return {"indicator": next(i for i in INDICATORS if i["id"] == indicator), "rows": rows, "total": total}


@api.get("/summary")
async def summary(year: int, unit_type: UnitType = "kelurahan", period_type: PeriodType = "tahunan", period_index: int = 1):
    months = period_months(period_type, period_index)
    out = []
    for ind in indicators_for(unit_type):
        _, total = await build_report(ind["id"], year, unit_type, months)
        out.append({**ind, **total})
    return out


@api.get("/trend")
async def trend(indicator: str, year: int, unit_type: UnitType = "kelurahan"):
    check_indicator(indicator)
    unit_ids = [str(u["_id"]) for u in await db.units.find({"type": unit_type}, {"_id": 1}).to_list(500)]
    annual = sum(t.get("target_angka", 0) for t in await db.targets.find({"indicator": indicator, "year": year, "unit_id": {"$in": unit_ids}}).to_list(1000))
    if indicator in LUAR_KOTA_INDICATORS: unit_ids.append(LUAR_KOTA_ID)
    monthly = [0.0] * 12
    async for c in db.capaian.find({"indicator": indicator, "year": year, "unit_id": {"$in": unit_ids}}):
        monthly[c["month"] - 1] += c["value"]
    out, cum = [], 0
    for m in range(12):
        cum += monthly[m]
        out.append({"month": m + 1, "capaian": monthly[m], "kumulatif": cum,
                    "target_kumulatif": round(annual * (m + 1) / 12, 2), "persen_kumulatif": pct(cum, annual * (m + 1) / 12)})
    return out


@api.get("/input")
async def get_input(indicator: str, year: int, unit_type: UnitType, _=Depends(current_admin)):
    check_indicator(indicator)
    units = [Unit.from_mongo(u) for u in await db.units.find({"type": unit_type}).sort([("order", 1), ("name", 1)]).to_list(500)]
    targets = {t["unit_id"]: t for t in await db.targets.find({"indicator": indicator, "year": year}).to_list(1000)}
    caps = {}
    async for c in db.capaian.find({"indicator": indicator, "year": year}):
        caps.setdefault(c["unit_id"], [0] * 12)[c["month"] - 1] = c["value"]
    rows = [{"unit_id": u.id, "unit_name": u.name,
             "target_angka": targets.get(u.id, {}).get("target_angka", 0),
             "target_persen": targets.get(u.id, {}).get("target_persen", 100),
             "months": caps.get(u.id, [0] * 12)} for u in units]
    if indicator in LUAR_KOTA_INDICATORS:
        rows.append({"unit_id": LUAR_KOTA_ID, "unit_name": "LUAR KOTA", "target_angka": 0, "target_persen": 0, "months": caps.get(LUAR_KOTA_ID, [0] * 12), "luar_kota": True})
    return rows


@api.put("/input")
async def save_input(body: InputPayload, _=Depends(current_admin)):
    check_indicator(body.indicator)
    now = datetime.now(timezone.utc).isoformat()
    for r in body.rows:
        key = {"indicator": body.indicator, "year": body.year, "unit_id": r.unit_id}
        if r.unit_id == LUAR_KOTA_ID and body.indicator not in LUAR_KOTA_INDICATORS: raise HTTPException(400, "Indikator ini tidak memiliki data luar kota")
        if r.unit_id != LUAR_KOTA_ID:
            await db.targets.update_one(key, {"$set": {"target_angka": r.target_angka, "target_persen": r.target_persen, "updated_at": now}}, upsert=True)
        for i, v in enumerate(r.months):
            if v < 0: raise HTTPException(400, "Capaian tidak boleh negatif")
            await db.capaian.update_one({**key, "month": i + 1}, {"$set": {"value": v, "updated_at": now}}, upsert=True)
    return {"ok": True, "saved": len(body.rows)}


ALLOWED_DOCS = {
    "pdf": "application/pdf",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "csv": "text/csv",
}
MAX_DOC_BYTES = 15 * 1024 * 1024


def doc_out(d):
    return {"id": str(d["_id"]), "indicator": d["indicator"], "year": d["year"], "filename": d["filename"],
            "content_type": d["content_type"], "size": d["size"], "keterangan": d.get("keterangan", ""), "created_at": d["created_at"]}


@api.get("/documents")
async def list_documents(indicator: str, year: int):
    check_indicator(indicator)
    docs = await db.documents.find({"indicator": indicator, "year": year, "is_deleted": False}).sort("created_at", -1).to_list(500)
    return [doc_out(d) for d in docs]


@api.post("/documents")
async def upload_document(indicator: str = Form(...), year: int = Form(...), keterangan: str = Form(""),
                          file: UploadFile = File(...), _=Depends(current_admin)):
    check_indicator(indicator)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_DOCS: raise HTTPException(400, "Format tidak didukung. Gunakan PDF, Excel, Word, atau CSV")
    data = await file.read()
    if len(data) > MAX_DOC_BYTES: raise HTTPException(400, "Ukuran file maksimal 15 MB")
    path = f"{APP_NAME}/documents/{indicator}/{year}/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, ALLOWED_DOCS[ext])
    except Exception as e:
        logger.error(f"Upload gagal: {e}")
        raise HTTPException(502, "Gagal mengunggah ke penyimpanan")
    doc = {"indicator": indicator, "year": year, "filename": file.filename, "content_type": ALLOWED_DOCS[ext], "size": result["size"],
           "storage_path": result["path"], "keterangan": keterangan.strip(), "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.documents.insert_one(doc)
    doc["_id"] = r.inserted_id
    return doc_out(doc)


@api.get("/documents/{doc_id}/download")
async def download_document(doc_id: str):
    if not ObjectId.is_valid(doc_id): raise HTTPException(404, "Dokumen tidak ditemukan")
    d = await db.documents.find_one({"_id": ObjectId(doc_id), "is_deleted": False})
    if not d: raise HTTPException(404, "Dokumen tidak ditemukan")
    data, ct = await run_in_threadpool(get_object, d["storage_path"])
    safe = quote(d["filename"])
    return Response(content=data, media_type=d.get("content_type", ct),
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe}"})


@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, _=Depends(current_admin)):
    if not ObjectId.is_valid(doc_id): raise HTTPException(404, "Dokumen tidak ditemukan")
    r = await db.documents.update_one({"_id": ObjectId(doc_id), "is_deleted": False}, {"$set": {"is_deleted": True}})
    if not r.matched_count: raise HTTPException(404, "Dokumen tidak ditemukan")
    return {"ok": True}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ['CORS_ORIGINS'].split(','),
                   allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.units.create_index([("type", 1), ("name", 1)], unique=True)
    await db.targets.create_index([("indicator", 1), ("year", 1), ("unit_id", 1)], unique=True)
    await db.capaian.create_index([("indicator", 1), ("year", 1), ("unit_id", 1), ("month", 1)], unique=True)
    await db.documents.create_index([("indicator", 1), ("year", 1), ("is_deleted", 1)])
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    email, pw = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    ex = await db.users.find_one({"email": email})
    if not ex:
        await db.users.insert_one({"email": email, "password_hash": hash_password(pw), "name": "Admin Dinkes", "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_password(pw, ex["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
    if not await db.units.count_documents({}):
        docs = [Unit(name=f"KELURAHAN {n}", type="kelurahan", order=i).to_mongo() for i, n in enumerate(KELURAHAN)]
        docs += [Unit(name=n, type="faskes", order=i).to_mongo() for i, n in enumerate(FASKES)]
        await db.units.insert_many(docs)


@app.on_event("shutdown")
async def shutdown(): client.close()
