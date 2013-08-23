/**
 * Define all error code constants.
 **/
Bitcoin.Errors = {
    // Standard JSON-RPC 2.0 errors
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParameters: -32602,
    InternalError: -32603,
    ParseError: -32700,

    // General application defined errors
    Unknown: -1,  // std::exception thrown in command handling
    ForbiddenBySafeMode: -2,  // Server is in safe mode, and command is not allowed in safe mode
    InvalidTypeError: -3,  // Unexpected type was passed as parameter
    InvalidAddressOrKey: -5,  // Invalid address or key
    OutOfMemory: -7,  // Ran out of memory during operation
    InvalidParameter: -8,  // Invalid, missing or duplicate parameter
    DatabaseError: -20, // Database error
    DeserializationError: -22, // Error parsing or validating structure in raw format

    // P2P client errors
    ClientNotConnected: -9,  // Bitcoin is not connected
    ClientInInitialDownload: -10, // Still downloading initial blocks

    // Wallet errors
    WalletError: -4,  // Unspecified problem with wallet (key not found etc.)
    InsufficientFunds: -6,  // Not enough funds in wallet or account
    InvalidAccountName: -11, // Invalid account name
    KeypoolRanOut: -12, // Keypool ran out, call keypoolrefill first
    UnlockNeeded: -13, // Enter the wallet passphrase with walletpassphrase first
    PassphraseIncorrect: -14, // The wallet passphrase entered was incorrect
    WrongEncryptionState: -15, // Command given in wrong wallet encryption state (encrypting an encrypted wallet etc.)
    EncryptionFailed: -16, // Failed to encrypt the wallet
    AlreadyUnlocked: -17 // Wallet is already unlocked
};

