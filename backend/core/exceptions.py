from fastapi import HTTPException


class AppException(HTTPException):
    """Base application exception that maps to a structured JSON error response."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


class NotFoundError(AppException):
    def __init__(self, entity: str):
        super().__init__(404, f"{entity.upper()}_NOT_FOUND", f"{entity} not found.")


class ConflictError(AppException):
    def __init__(self, code: str, message: str):
        super().__init__(409, code, message)


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__(400, "VALIDATION_ERROR", message)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required."):
        super().__init__(401, "UNAUTHORIZED", message)


class ForbiddenError(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(403, "FORBIDDEN", message)
