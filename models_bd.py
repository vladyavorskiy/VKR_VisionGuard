from sqlalchemy import Column, Boolean, Integer, String, Text, ForeignKey, DateTime
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
    detected_objects = relationship("DetectedObject", back_populates="camera", cascade="all, delete-orphan")
    class_associations = relationship("CameraClassAssociation", back_populates="camera", cascade="all, delete-orphan")

class DetectedObject(Base):
    __tablename__ = "detected_objects"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    tracker_id = Column(Integer, nullable=False)  # ID из SORT трекера
    object_class = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)  # Может быть None, если объект ещё в кадре
    image_path = Column(String, nullable=True)  # Путь к изображению первого появления
    video_path = Column(String, nullable=True)

    camera = relationship("Camera", back_populates="detected_objects")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

class CameraClassAssociation(Base):
    __tablename__ = "camera_class_association"

    id = Column(Integer, primary_key=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))

    is_ignored = Column(Boolean, default=False)
    is_notify = Column(Boolean, default=False)

    camera = relationship("Camera", back_populates="class_associations")
    object_class = relationship("Class")



from database import Base, engine
Base.metadata.create_all(bind=engine)
