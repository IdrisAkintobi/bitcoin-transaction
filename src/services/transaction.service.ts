import BIP32Factory from 'bip32';
import { Network, Psbt, Transaction, crypto, payments, script } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

export class TransactionService {
    public static decodeTransactionHex(hex: string) {
        const decodedTransaction = Transaction.fromHex(hex);

        // Extract the version and locktime
        const version = decodedTransaction.version;
        const locktime = decodedTransaction.locktime;

        // Map through the inputs and extract the txid, index, script, sequence, and witness
        const inputs = decodedTransaction.ins.map(input => {
            return {
                txid: input.hash?.reverse().toString('hex'),
                index: input.index,
                script: input.script?.toString('hex'),
                sequence: input.sequence,
                ...(input.witness && {
                    witness: input.witness.map(i => i.toString('hex')),
                }),
            };
        });

        // Map through the outputs and extract the value and script
        const outputs = decodedTransaction.outs.map(output => {
            return {
                value: output.value,
                script: output.script.toString('hex'),
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
        const scriptBuffer = Buffer.from(hex, 'hex');
        const parsedScript = script.compile(scriptBuffer);

        // Convert the script to ASM
        return script.toASM(parsedScript);
    }

    public static createRedeemScriptFromPreimage(preimage: string) {
        // Calculate SHA256 hash of the preimage
        const sha256Hash = crypto.sha256(Buffer.from(preimage, 'utf8')).toString('hex');

        // Create the redeem script for the given script  OP_SHA256 <lock_hex> OP_EQUAL
        const compiledScript = script.compile([
            script.OPS.OP_SHA256,
            Buffer.from(sha256Hash, 'hex'),
            script.OPS.OP_EQUAL,
        ]);

        return compiledScript.toString('hex');
    }

    public static deriveP2SHAddress(redeemScriptHex: string, appNetwork: Network): string {
        // Create a P2SH (Pay-to-Script-Hash) address from the redeem script
        const scriptBuffer = Buffer.from(redeemScriptHex, 'hex');
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
        fee: number,
    ) {
        // Create a new Psbt instance
        const psbt = new Psbt({ network: appNetwork });

        // Create a BIP32 instance from the seed
        const seedBuffer = Buffer.from(seed, 'hex');
        const bip32 = BIP32Factory(ecc);
        const rootKey = bip32.fromSeed(seedBuffer, appNetwork);

        // Derive the key pair from the root key
        const keyPair = rootKey.derivePath(`m/44'/0'/0'/0/0'`);

        // Calculate the total value of the unspent outputs
        const totalValue = 113593;
        // Check if the total value is greater than the amount + fee
        if (totalValue < amount + fee) throw new Error('Insufficient funds');

        const transactionHex =
            '02000000000101b30af604ff8d8ead9f4225638953e02dd507b382e2cfb4c3fc75b4a74c0b64400000000000fdffffff02b9bb01000000000017a91432971b01a505e62b860ed9c960f98b64252b294287269137070100000017a914715329031bfb1b6758222baf8f93ef35f931832e87024730440220320b421d1168a440e1b937e98fa5baa84e857846409605ac17c557df6132ac4202205555ede114d2c520f22907aa8abf197a69851c9deb7c3ed343ddde7192dfe65301210314e15958427ad49ba9c2a886cc8ce399adbf14a8c4721deaad78d45129be4f72384e2700';

        // Get prevout script
        const prevoutScript = payments.p2sh({
            redeem: payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: appNetwork,
            }),
        });

        // Add the inputs to the Psbt instance
        psbt.addInput({
            hash: '2ceacea9eee801cd4f8d82f73d0b5ee9d3d679a296208cd240388e6a8b640cb8',
            index: 0,
            redeemScript: prevoutScript.redeem!.output!,
            nonWitnessUtxo: Buffer.from(transactionHex, 'hex'),
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
        psbt.signInput(0, keyPair);

        // Finalize the Psbt instance
        psbt.finalizeAllInputs();

        // Return the signed transaction hex and transaction id
        return {
            hex: psbt.extractTransaction().toHex(),
            txid: psbt.extractTransaction().getId(),
        };
    }
}
