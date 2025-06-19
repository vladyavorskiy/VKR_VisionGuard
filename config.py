import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    SESSION_TYPE = "filesystem"
    YANDEX_CLIENT_ID = os.getenv("YANDEX_CLIENT_ID")
    YANDEX_CLIENT_SECRET = os.getenv("YANDEX_CLIENT_SECRET")
    REDIRECT_URI = os.getenv("REDIRECT_URI")
    WTF_CSRF_ENABLED = True
