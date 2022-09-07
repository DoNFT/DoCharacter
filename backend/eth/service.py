import json
from abc import ABC
from pathlib import Path
from typing import Any
from typing import Type

from web3 import Web3

from settings import ENVIRONMENT
from settings import Environment


class AbstractWeb3Service(ABC):
    def __init__(self, *args, **kwargs):
        pass

    def has_token_ownership(
        self, contract_address: Any, token_id: str, address_to_check: str
    ) -> bool:
        raise NotImplementedError


class Web3Service(AbstractWeb3Service):
    def __init__(self, eth_node: str):
        self._web3 = Web3(Web3.HTTPProvider(eth_node))
        with open(Path(__file__).parent / "abi.json") as f:
            self._abi = json.load(f)
        super().__init__()

    def has_token_ownership(
        self, contract_address: Any, token_id: str, address_to_check: str
    ) -> bool:
        contract = self._web3.eth.contract(address=contract_address, abi=self._abi)
        owner_address = contract.functions.ownerOf(token_id).call()
        return address_to_check == owner_address


class NoopWeb3Service(AbstractWeb3Service):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def has_token_ownership(
        self, contract_address: Any, token_id: str, address_to_check: str
    ) -> bool:
        return True


def get_service_cls() -> Type[AbstractWeb3Service]:
    if ENVIRONMENT == Environment.DEV:
        return NoopWeb3Service
    else:
        return Web3Service
