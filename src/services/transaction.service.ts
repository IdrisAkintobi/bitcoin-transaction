import BIP32Factory from "bip32";
import { Network, Psbt, Transaction, crypto, networks, payments, script } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { TransactionResponse } from "../types/interface";

export class TransactionService {
    public static decodeTransactionHex(hex: string) {
        const decodedTransaction = Transaction.fromHex(hex);

        // Extract the version and locktime
        const version = decodedTransaction.version;
        const locktime = decodedTransaction.locktime;

        // Map through the inputs and extract the txid, index, script, sequence, and witness
        const inputs = decodedTransaction.ins.map((input) => {
            return {
                txid: input.hash?.reverse().toString("hex"),
                index: input.index,
                script: input.script?.toString("hex"),
                sequence: input.sequence,
                ...(input.witness && {
                    witness: input.witness.map((i) => i.toString("hex")),
                }),
            };
        });

        // Map through the outputs and extract the value and script
        const outputs = decodedTransaction.outs.map((output) => {
            return {
                value: output.value,
                script: output.script.toString("hex"),
            };
        });

        return {
            version,
            locktime,
            inputs,
            outputs,
        };
    }

    public static scriptHexToASM(hex: string) {
        const scriptBuffer = Buffer.from(hex, "hex");
        const parsedScript = script.compile(scriptBuffer);

        // Convert the script to ASM
        return script.toASM(parsedScript);
    }

    public static createRedeemScriptFromPreimage(preimage: string) {
        // Calculate SHA256 hash of the preimage
        const sha256Hash = crypto.sha256(Buffer.from(preimage, "utf8")).toString("hex");

        // Create the redeem script for the given script  OP_SHA256 <lock_hex> OP_EQUAL
        const compiledScript = script.compile([
            script.OPS.OP_SHA256,
            Buffer.from(sha256Hash, "hex"),
            script.OPS.OP_EQUAL,
        ]);

        return compiledScript.toString("hex");
    }

    public static deriveP2SHAddress(redeemScriptHex: string, appNetwork: Network): string {
        // Create a P2SH (Pay-to-Script-Hash) address from the redeem script
        const scriptBuffer = Buffer.from(redeemScriptHex, "hex");
        const p2sh = payments.p2sh({
            redeem: { output: scriptBuffer, network: appNetwork },
        });
        return p2sh.address as string;
    }

    public static async createSignedTransaction(
        fromAddress: string,
        toAddress: string,
        seed: string,
        appNetwork: Network,
        amount: number,
        fee: number
    ) {
        // Create a new Psbt instance
        const psbt = new Psbt({ network: appNetwork });

        // Create a BIP32 instance from the seed
        const seedBuffer = Buffer.from(seed, "hex");
        const bip32 = BIP32Factory(ecc);
        const rootKey = bip32.fromSeed(seedBuffer, appNetwork);

        // Derive the key pair from the root key
        const keyPair = rootKey.derivePath(`m/44'/0'/0'/0/0'`);

        // Get unspent outputs for the from address
        const utxos = await this.getUnspentBitcoinOutputs(fromAddress, appNetwork);

        // Calculate the total value of the unspent outputs
        const totalValue = utxos.reduce((prev, curr) => prev + curr.value, 0);
        // Check if the total value is greater than the amount + fee
        if (totalValue < amount + fee) throw new Error("Insufficient funds");

        // Get prevout script
        const prevoutScript = payments.p2sh({
            redeem: payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: appNetwork,
            }),
        });

        // Add the inputs to the Psbt instance
        utxos.forEach((utxo) => {
            psbt.addInput({
                hash: utxo.txid,
                index: 0,
                witnessUtxo: {
                    script: prevoutScript.output!,
                    value: utxo.value,
                },
                redeemScript: prevoutScript.redeem!.output!,
            });
        });

        // Add the output to the Psbt instance
        psbt.addOutput({
            address: toAddress,
            value: amount,
        });

        // Add change output to the Psbt instance
        psbt.addOutput({
            address: fromAddress,
            value: totalValue - amount - fee,
        });

        // Sign all the inputs
        psbt.signAllInputs(keyPair);

        // Finalize the Psbt instance
        psbt.finalizeAllInputs();

        // Return the signed transaction hex and transaction id
        return {
            hex: psbt.extractTransaction().toHex(),
            txid: psbt.extractTransaction().getId(),
        };
    }

    public static async getUnspentBitcoinOutputs(address: string, appNetwork: Network) {
        const urlRoute = appNetwork === networks.testnet ? "/testnet" : "";
        // Use a blockchain explorer API to get unspent outputs (UTXOs) for the given address
        const url = `https://blockstream.info${urlRoute}/api/address/${address}/utxo`;

        try {
            const response = await fetch(url);
            const utxos = await response.json();
            return utxos as TransactionResponse[];
        } catch (error) {
            throw new Error(`Unable to get UTXOs for address: ${address}`);
        }
    }
}
