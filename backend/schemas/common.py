"""Shared response envelope and pagination schemas."""

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Meta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class ListResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    meta: Meta


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
