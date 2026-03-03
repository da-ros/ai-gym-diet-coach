from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./coach.db"
    ANTHROPIC_API_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    # Supabase project URL for JWKS (verify ECC-signed tokens). e.g. https://xxx.supabase.co
    SUPABASE_URL: str = ""

    # Claude model names
    CLAUDE_VISION_MODEL: str = "claude-sonnet-4-6"
    CLAUDE_TEXT_MODEL: str = "claude-haiku-4-5-20251001"

    # Protein spike threshold in grams
    PROTEIN_SPIKE_THRESHOLD_G: float = 20.0


settings = Settings()
