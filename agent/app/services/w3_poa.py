"""Mezo testnet Web3 client with POA extraData middleware (web3 6.x / 7.x)."""

from web3 import Web3


def inject_poa_middleware(w3: Web3) -> None:
    # web3 6.20+ / Python 3.14 builds often omit this from web3.middleware.__init__
    try:
        from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware
    except ImportError:
        from web3.middleware import ExtraDataToPOAMiddleware
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)


def make_http_web3(rpc_url: str) -> Web3:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    inject_poa_middleware(w3)
    return w3
