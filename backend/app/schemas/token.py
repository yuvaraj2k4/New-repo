from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "Bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    
class LoginRequest(BaseModel):
    email: str
    password: str
