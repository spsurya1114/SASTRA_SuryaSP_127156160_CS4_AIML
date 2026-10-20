"""
routers/auth.py — Classroom Login and Registration endpoints.

POST /auth/register — Create a new classroom account
POST /auth/login    — Login to an existing classroom account
GET  /auth/me       — Fetch authenticated classroom details
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_utils import create_access_token, get_current_classroom, get_current_admin, hash_password, verify_password
from database import get_db
from models import Classroom, Admin
from schemas import (
    ClassroomCreate, ClassroomLogin, ClassroomResponse, TokenResponse,
    AdminLogin, AdminResponse, AdminTokenResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_classroom(payload: ClassroomCreate, db: Session = Depends(get_db)):
    """
    Create a new classroom account with username/classroom name and password.
    """
    clean_name = payload.name.strip()
    existing = db.query(Classroom).filter(Classroom.name.ilike(clean_name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Classroom '{clean_name}' already exists. Please login instead.",
        )

    classroom = Classroom(
        name=clean_name,
        password_hash=hash_password(payload.password),
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    token = create_access_token({"classroom_id": classroom.id, "classroom_name": classroom.name, "role": "classroom"})
    logger.info("Registered new classroom '%s' (id=%d)", classroom.name, classroom.id)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        classroom=ClassroomResponse.model_validate(classroom),
    )


@router.post("/login", response_model=TokenResponse)
def login_classroom(payload: ClassroomLogin, db: Session = Depends(get_db)):
    """
    Authenticate a classroom using username/classroom name and password.
    """
    clean_name = payload.name.strip()
    classroom = db.query(Classroom).filter(Classroom.name.ilike(clean_name)).first()
    if not classroom or not verify_password(payload.password, classroom.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid classroom username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"classroom_id": classroom.id, "classroom_name": classroom.name, "role": "classroom"})
    logger.info("Classroom '%s' logged in (id=%d)", classroom.name, classroom.id)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        classroom=ClassroomResponse.model_validate(classroom),
    )


@router.get("/me", response_model=ClassroomResponse)
def get_me(current_classroom: Classroom = Depends(get_current_classroom)):
    """
    Get the authenticated classroom details for the current user session.
    """
    return ClassroomResponse.model_validate(current_classroom)


@router.post("/admin/login", response_model=AdminTokenResponse)
def login_admin(payload: AdminLogin, db: Session = Depends(get_db)):
    """
    Authenticate as Admin using admin username and password.
    """
    clean_user = payload.username.strip()
    admin = db.query(Admin).filter(Admin.username.ilike(clean_user)).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"admin_id": admin.id, "username": admin.username, "role": "admin"})
    logger.info("Admin '%s' logged in (id=%d)", admin.username, admin.id)

    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        admin=AdminResponse.model_validate(admin),
    )


@router.get("/admin/me", response_model=AdminResponse)
def get_admin_me(current_admin: Admin = Depends(get_current_admin)):
    """
    Get current authenticated admin details.
    """
    return AdminResponse.model_validate(current_admin)

