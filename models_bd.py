from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    yandex_id = Column(String, unique=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    gender = Column(String(50))
    avatar = Column(String)

    cameras = relationship("Camera", back_populates="owner")


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    url = Column(String, nullable=False)
    protocol = Column(String(50), nullable=False)
    description = Column(Text)
    tags = Column(String)  # можно хранить как строку с тегами через запятую
    image = Column(String)
    added_at = Column(DateTime)

    owner = relationship("User", back_populates="cameras")






# from database import Base, engine
# Base.metadata.create_all(bind=engine)