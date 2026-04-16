from fastapi import Depends, HTTPException, status, Request, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID

from app.core.config import settings
from app.core.security import decode_token, verify_csrf_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import ProjectMember

# Note: this matches the endpoint path we will create later in auth route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    token: str | None = Depends(oauth2_scheme),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        access_token = token or (request.cookies.get(settings.ACCESS_COOKIE_NAME) if request else None)
        if not access_token:
            raise credentials_exception

        payload = decode_token(access_token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Ensures token is not a refresh token being used as access token
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token cannot be used as an access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError:
        raise credentials_exception
        
    stmt = select(User).where(User.id == UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
        
    return user

async def require_org_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency ensuring the user is an Organization Admin."""
    if current_user.role != UserRole.org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user


async def require_project_member(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that ensures the current user belongs to `project_id`.
    Org-admins bypass the check (they can see all projects in their org).
    """
    if current_user.role == UserRole.org_admin:
        return current_user

    stmt = select(ProjectMember).where(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project",
        )
    return current_user


async def validate_csrf(
    request: Request,
    x_csrf_token: str | None = Header(None, alias=settings.CSRF_HEADER_NAME),
) -> None:
    """
    Dependency to validate CSRF token using double-submit cookie pattern.
    CSRF token must be present in both cookie and header, and they must match.
    """
    # Skip CSRF validation for safe methods
    if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
        return

    cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)

    if not verify_csrf_token(x_csrf_token, cookie_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing or invalid",
        )
