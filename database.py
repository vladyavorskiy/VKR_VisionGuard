from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Пример строки подключения:
DATABASE_URL = "postgresql+psycopg2://postgres:Ghjgecnb55@localhost:5432/visionguard"

# Создаем движок (engine)
engine = create_engine(DATABASE_URL)

# Создаем сессию
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()
