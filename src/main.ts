import { networks } from 'bitcoinjs-lib';
import hexArray from './data/hex.array';
import { TransactionService } from './services/transaction.service';

const appNetwork = networks.testnet;

const amountToSend = 82312;
const fee = 5000;
const seed = '305a2e5a1c156e566c67b0658340937ed233c357094711d705f6c66bdd0329e3';
const addressWithBalance = '2MwrinsNPrqwqup5G5DQ5BG2XnxjLs8y28z';

(async () => {
    /**
     * First exercise
     */
    const decodedTransactions = hexArray.map(TransactionService.decodeTransactionHex);
    // json stringify input and output for console readability
    decodedTransactions.forEach(decodedTransaction => {
        decodedTransaction.inputs = JSON.stringify(decodedTransaction.inputs) as any;
        decodedTransaction.outputs = JSON.stringify(decodedTransaction.outputs) as any;
    });
    console.log(decodedTransactions);

    /**
     * Second exercise
     */
    const scriptHex = '010101029301038801027693010487';
    const scriptOP_CODES = TransactionService.scriptHexToASM(scriptHex);
    console.log(`script OP_CODES: ${scriptOP_CODES}`);

    /**
     * Third exercise - a
     */
    // derive address from the second exercise
    const derivedAddress = TransactionService.deriveP2SHAddress(scriptHex, appNetwork);
    console.log(`Second exercise - P2SH derived Address: ${derivedAddress}`);
    // construct transaction that send bitcoin to the address
    const transaction = await TransactionService.createSignedTransaction(
        addressWithBalance,
        derivedAddress,
        seed,
        appNetwork,
        amountToSend,
        fee,
    );
    console.log(`Third exercise - transactionHex: ${transaction.hex}`);

    /**
     * Third exercise - b
     */
    const redeemScriptHex = TransactionService.createRedeemScriptFromPreimage('Btrust Builders');
    const p2shAddress = TransactionService.deriveP2SHAddress(redeemScriptHex, appNetwork);
    console.log(`Third exercise - P2SH derived Address: ${p2shAddress}`);
    const transactionData = await TransactionService.createSignedTransaction(
        addressWithBalance,
        p2shAddress,
        seed,
        appNetwork,
        amountToSend,
        fee,
    );
    console.log('transactionId', transactionData.txid);
})();
