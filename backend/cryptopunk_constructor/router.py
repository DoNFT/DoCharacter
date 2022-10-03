from fastapi import APIRouter

from cryptopunk_constructor.base_effect_router import check_token
from cryptopunk_constructor.base_effect_router import fetch_contents
from cryptopunk_constructor.base_effect_router import generate_content
from cryptopunk_constructor.base_effect_router import response_content
from cryptopunk_constructor.base_effect_router import service
from cryptopunk_constructor.base_effect_router import upload_content
from cryptopunk_constructor.data_types import AddNumberPayload
from cryptopunk_constructor.data_types import ApplyEffectPayload
from cryptopunk_constructor.data_types import UploadPayload

router = APIRouter(prefix="/effects")


@router.post("/applyEffect")
async def apply_effect(effect_payload: ApplyEffectPayload):
    check_token(effect_payload.original.contract, effect_payload.original.tokenId, effect_payload.sender)
    for modificator_effect in effect_payload.modificator:
        check_token(modificator_effect.contract, modificator_effect.tokenId, effect_payload.sender)

    contents = await fetch_contents(
        [effect_payload.original.contentUrl] + [mod.contentUrl for mod in effect_payload.modificator]
    )

    transformed = await generate_content(contents)

    res = response_content(transformed)
    return res


@router.post("/addIPFS")
async def add_ipfs(upload_payload: UploadPayload):
    ipfs_url = await upload_content(upload_payload.content)
    return ipfs_url


@router.post("/changeColor")
async def change_color(effect_payload: ApplyEffectPayload):
    check_token(effect_payload.original.contract, effect_payload.original.tokenId, effect_payload.sender)
    for modificator_effect in effect_payload.modificator:
        check_token(modificator_effect.contract, modificator_effect.tokenId, effect_payload.sender)

    attribute_image, color_image = await fetch_contents(
        [effect_payload.original.contentUrl, effect_payload.modificator[-1].contentUrl]
    )

    new_attribute = await service.change_color(attribute_image, color_image)
    ipfs_url = await upload_content(new_attribute)

    res = response_content(new_attribute, ipfs_url)
    return res


@router.post("/addNumber")
async def add_number(add_number_payload: AddNumberPayload):
    check_token(add_number_payload.original.contract, add_number_payload.original.tokenId, add_number_payload.sender)
    contents = await fetch_contents([add_number_payload.original.contentUrl])
    punk_image = contents[0]
    punk = await service.add_number(punk_image, add_number_payload.number)
    ipfs_url = await upload_content(punk)
    res = response_content(punk, ipfs_url)
    return res
