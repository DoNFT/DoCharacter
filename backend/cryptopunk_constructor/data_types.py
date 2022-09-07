from typing import List

from pydantic import BaseModel


class UploadPayload(BaseModel):
    content: bytes


class ContentPayload(BaseModel):
    contract: str
    tokenId: str
    contentUrl: str


class ApplyEffectPayload(BaseModel):
    original: ContentPayload
    modificator: List[ContentPayload]
    sender: str


class AddNumberPayload(BaseModel):
    original: ContentPayload
    number: str
    sender: str
