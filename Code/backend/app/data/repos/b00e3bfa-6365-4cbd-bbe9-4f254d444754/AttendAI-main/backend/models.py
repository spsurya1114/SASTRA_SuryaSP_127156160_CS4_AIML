"""
models.py — SQLAlchemy ORM models for AttendAI.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime,
    ForeignKey, UniqueConstraint, LargeBinary, func,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY
from pgvector.sqlalchemy import Vector
from database import Base


class ClassroomStudent(Base):
    __tablename__ = "classroom_students"
    __table_args__ = (
        UniqueConstraint("classroom_id", "student_id", name="uq_classroom_student"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id   = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    enrolled_at  = Column(DateTime(timezone=True), server_default=func.now())

    classroom = relationship("Classroom", back_populates="student_associations")
    student   = relationship("Student", back_populates="classroom_associations")


class Classroom(Base):
    __tablename__ = "classrooms"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    student_associations = relationship("ClassroomStudent", back_populates="classroom", cascade="all, delete-orphan")
    students             = relationship("Student", secondary="classroom_students", back_populates="classrooms", viewonly=True)
    attendance_sessions  = relationship("AttendanceSession", back_populates="classroom", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id           = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True, index=True)
    name         = Column(String(255), nullable=False)
    roll_number  = Column(String(50),  nullable=True)
    photo_data   = Column(LargeBinary, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    classroom_associations = relationship("ClassroomStudent", back_populates="student", cascade="all, delete-orphan")
    classrooms             = relationship("Classroom", secondary="classroom_students", back_populates="students", viewonly=True)
    embeddings             = relationship(
        "StudentEmbedding", back_populates="student",
        cascade="all, delete-orphan", lazy="select",
    )
    attendance_records     = relationship(
        "AttendanceRecord", back_populates="student",
        cascade="all, delete-orphan",
    )


class Admin(Base):
    __tablename__ = "admins"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class StudentEmbedding(Base):
    __tablename__ = "student_embeddings"

    id                       = Column(Integer, primary_key=True, index=True)
    student_id               = Column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    embedding                = Column(Vector(512), nullable=False)
    reference_photo_filename = Column(String(255))
    created_at               = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="embeddings")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id           = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    date         = Column(Date, nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    classroom = relationship("Classroom", back_populates="attendance_sessions")
    records   = relationship(
        "AttendanceRecord", back_populates="session",
        cascade="all, delete-orphan",
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    id               = Column(Integer, primary_key=True, index=True)
    session_id       = Column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    student_id       = Column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    status           = Column(String(20), nullable=False, default="present")   # present | absent
    confidence_score = Column(Float)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")


