"""
Verify Supabase JWTs: supports both legacy HS256 (shared secret) and
new ECC/RS256 (JWKS from Supabase project URL).
"""
from fastapi import Header, HTTPException
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError, ExpiredSignatureError

from .config import settings


def _get_unverified_header(token: str) -> dict:
    return jwt.get_unverified_header(token)


def _verify_hs256(token: str) -> str:
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )
    return payload["sub"]


def _verify_with_jwks(token: str, alg: str) -> str:
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=500,
            detail="Server auth not configured (SUPABASE_URL). Set it in .env to verify ECC-signed tokens (e.g. https://YOUR_PROJECT_REF.supabase.co).",
        )
    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    jwks_client = PyJWKClient(url)
    header = _get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise ValueError("Token header missing kid")
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=[alg],
        options={"verify_aud": False},
    )
    return payload["sub"]


def get_current_user(authorization: str = Header(..., alias="Authorization")) -> str:
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer" or not token or token.lower() == "null":
            raise ValueError("Missing or invalid Authorization header")

        header = _get_unverified_header(token)
        alg = (header.get("alg") or "").upper()

        if alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=500,
                    detail="Server auth not configured (SUPABASE_JWT_SECRET). Set it from Supabase → Settings → API → Legacy JWT Secret.",
                )
            return _verify_hs256(token)
        if alg in ("ES256", "RS256"):
            return _verify_with_jwks(token, alg)

        raise HTTPException(
            status_code=401,
            detail=f"Unsupported token algorithm: {alg}. Configure SUPABASE_URL in .env for ECC-signed tokens.",
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please sign in again.")
    except PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token. If using new Supabase signing keys, set SUPABASE_URL in .env (e.g. https://YOUR_PROJECT_REF.supabase.co).",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
