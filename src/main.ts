import { networks } from "bitcoinjs-lib";
import { TransactionService } from "./services/transaction.service";

(async () => {
    const appNetwork = networks.testnet;
    const seed = "305a2e5a1c156e566c67b0658340937ed233c357094711d705f6c66bdd0329e3";
    const addressWithBalance = "2MwrinsNPrqwqup5G5DQ5BG2XnxjLs8y28z";
    const redeemScriptHex = TransactionService.createRedeemScript("Btrust Builders");
    const p2wshAddress = TransactionService.deriveP2WSHAddress(redeemScriptHex, appNetwork);
    console.log(`P2WSH Address: ${p2wshAddress}`);
    const transaction = await TransactionService.createSignedTransaction(
        addressWithBalance,
        p2wshAddress,
        seed,
        appNetwork,
        redeemScriptHex,
        82312
    );
    console.log(transaction);
})();
