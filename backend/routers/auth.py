from fastapi import APIRouter

from core.dependencies import DbSession
from schemas.auth import AuthResponseSchema, LoginSchema, RegisterSchema
from schemas.common import SuccessResponse
from services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=SuccessResponse[AuthResponseSchema], status_code=201)
async def register(data: RegisterSchema, db: DbSession):
    svc = AuthService(db)
    result = await svc.register(data)
    return SuccessResponse[AuthResponseSchema](data=result)


@router.post("/login", response_model=SuccessResponse[AuthResponseSchema])
async def login(data: LoginSchema, db: DbSession):
    svc = AuthService(db)
    result = await svc.login(data)
    return SuccessResponse[AuthResponseSchema](data=result)
