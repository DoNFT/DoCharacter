const codes = {
    USER_NOT_CONNECTED: '1000',
    CONNECTOR_NOT_INIT: '1001',
    PROVIDER_NOT_FOUND: '1002',
    CONNECTOR_NAME_NOT_SPECIFIED: '1003',
    PARSE_RARIBLE_TOKENS: '1004',
    IMG_NOT_EXIST: '1005',
    APPLY_ERROR: '1006',
    LOAD_MEDIA_ERROR: '1007',
    TRN_COMPLETE: '1008',
    NETWORK_ERROR: '1009',
    ACCOUNT_TOKENS_READING: '1010',
    SEND_NFT: '1011',
    THE_SAME_ADDRESS: '1012',
    UNWRAPPING: '1013',
    CONTRACT_ADDRESS_ERROR: '1014',
    USE_THE_SAME_ADDRESS: '1015',
    CONTRACT_EXIST: '1016',
    CONTRACT_NOT_FOUND: '1017',
    METHOD_NOT_AVAILABLE: '1018',
    METHOD_NOT_DETECTED: '1019',
    TRANSPORT_NOT_SUPPORTED: '2000',
    DENIED_ACCESS: '2001',
    DEVICE_LOCKED_OR_APP_CLOSE: '2002',
    NOT_CONNECTED: '2003',
    TURN_ON_BLIND_SIGN: '2004',
    USER_REJECTED_TRANSACTION: '2005',
    HAVE_SPECIAL_ROLE: '2006',
    MEDIA_TYPE_NOT_SUPPORTED: '2050',
    NETWORK_IN_NOT_INSTALLED: 'NETWORK_IN_NOT_INSTALLED',
    CHANGE_NETWORK_REJECTED: 'CHANGE_NETWORK_REJECTED',
    SWITCH_NETWORK_ERROR: 'SWITCH_NETWORK_ERROR',
}

export default codes

export function getErrorTextByCode(code) {
    const error = Object.entries(codes).find(entry => entry[1] === code)
    return error? error[0] : null
}