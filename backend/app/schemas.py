from pydantic import BaseModel, Field


class BBox(BaseModel):
    x: int
    y: int
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class Landmarks(BaseModel):
    leftEye: list[int]
    rightEye: list[int]
    nose: list[int]
    mouth: list[int]


class FacePrediction(BaseModel):
    id: str
    bbox: BBox
    landmarks: Landmarks
    emotion: str
    confidence: float = Field(ge=0, le=1)
    faceConfidence: float = Field(ge=0, le=1)
    emotionConfidence: float = Field(ge=0, le=1)
    needsReview: bool = False


class ImageInfo(BaseModel):
    width: int
    height: int


class PredictionResponse(BaseModel):
    image: ImageInfo
    faces: list[FacePrediction]
    warnings: list[str]
