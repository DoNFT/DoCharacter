import asyncio
import logging
from io import BytesIO

import requests
from aiohttp import ClientSession
from aiohttp import ClientTimeout
from fastapi import HTTPException
from fastapi import responses

from cryptopunk_constructor.cryptopunk_constructor_effect_service import CryptopunkConstructorEffectService
from eth.service import get_service_cls
from ipfs.service import IPFSServiceException
from ipfs.service import wrapper_ipfs_service
from settings import ETH_NODE
from settings import IPFS_API_HOST
from settings import IPFS_API_TIMEOUT
from settings import IPFS_PROJECT_ID
from settings import IPFS_PROJECT_SECRET
from settings import IPFS_SERVICE

web3_service = get_service_cls()(ETH_NODE)
service = CryptopunkConstructorEffectService()
wrapper_ipfs_service.init(IPFS_API_TIMEOUT, IPFS_SERVICE, (IPFS_API_HOST, IPFS_PROJECT_ID, IPFS_PROJECT_SECRET))
ipfs_service = wrapper_ipfs_service.get_ipfs_service()
ipfs_router = wrapper_ipfs_service.get_router()


class GenerationImageError(Exception):
    pass


class ResponseError(Exception):
    pass


class LoadContentError(Exception):
    pass


async def fetch_content(content_url: str, timeout: float = 20) -> bytes:
    logging.info(f"[Info] Fetching {content_url}")
    try:
        extracted_cid = ipfs_service.extract_cid(content_url)
        if extracted_cid is not None:
            logging.info(f"[Info] Getting cid {extracted_cid}")
            file = ''
            if content_url[-5:] == '/file':
                file = '/file'
            return await ipfs_service.cat(extracted_cid + file)
        elif 'ipfs' in content_url:
            logging.info("[Info] by http client")
            async with ClientSession(timeout=ClientTimeout(timeout)) as session:
                resp = await session.get(content_url)
                return await resp.read()
        else:
            return requests.get(content_url).content

    except Exception:
        raise LoadContentError("[Error] Didn't load file from " + content_url)


def check_token(contract, token_id, sender):
    logging.info(f"[Info]Checking ownerships of original {contract}:{token_id} to sender {sender}")
    if not web3_service.has_token_ownership(
            contract, token_id, sender,
    ):
        raise HTTPException(
            status_code=403, detail="original does not belong to sender"
        )


async def generate_content(contents, params=None):
    logging.info("[Info] Generating content")
    try:
        transformed = await service.transform(contents, params)
    except Exception:
        raise GenerationImageError("[Error] Failed to generate image")
    return transformed


async def fetch_contents(content_urls):
    logging.info("[Info] Fetching content")
    image_contents = await asyncio.gather(
        *[fetch_content(content_url) for content_url in content_urls],
    )
    return image_contents


async def upload_content(content):
    logging.info("[Info] Uploading content")
    try:
        ipfs_url = await ipfs_service.add(content)
    except Exception:
        raise IPFSServiceException("[Error] IPFS service error")
    return ipfs_url


def response_content(content, ipfs_url=''):
    logging.info("[Info] Responding")
    try:
        response_stream = BytesIO(content)
        res = responses.StreamingResponse(
            response_stream,
            media_type="image/jpeg",
            headers={"ContentUrl": f"ipfs://{ipfs_url}", "Access-Control-Expose-Headers": "ContentUrl"}
        )
    except Exception:
        raise ResponseError('[Error] Failed to send result')
    return res
