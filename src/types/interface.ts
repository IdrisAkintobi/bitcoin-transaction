export interface UserInterface {
    username: string;
    password: string;
    seed?: string;
}

export interface BlockchainInfoResponse {
    address: string;
    n_tx: number;
    unconfirmed_balance: number;
    total_received: number;
    total_sent: number;
    final_balance: number;
    txrefs: Array<Record<string, string | number>>;
}

export interface TransactionResponse {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}
