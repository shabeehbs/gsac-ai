from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from utils.database import Database
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    existing_user = await Database.fetch_one(
        "SELECT id FROM users WHERE email = $1",
        request.email
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = hash_password(request.password)

    user = await Database.fetch_one(
        """
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        RETURNING id, email, full_name, created_at
        """,
        request.email,
        password_hash,
        request.full_name
    )

    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "created_at": user["created_at"].isoformat()
        }
    }

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    user = await Database.fetch_one(
        "SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1",
        request.email
    )

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "created_at": user["created_at"].isoformat()
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await Database.fetch_one(
        "SELECT id, email, full_name, created_at FROM users WHERE id = $1",
        current_user["user_id"]
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "created_at": user["created_at"].isoformat()
    }
