import { networks } from 'bitcoinjs-lib';
import { TransactionService } from '../src/services/transaction.service';

describe('TransactionService', () => {
    it('should convert transaction hex to object', () => {
        const hex =
            '010000000104dde43b0e4724f1e3b45782a9bfbcc91ea764c7cb1c245fba1fefa175c3a5d0010000006a4730440220519f7867349790ee441e83e545afbd25b954a34e0733cd4da3b5f1e5588625050220166730d053c3672973bcb2bb1a977b747837023b647e3af2ac9c15728b0681da01210236ccb7ee3a9f154127f384a05870c4fd86a8727eab7316f1449a0b9e65bfd90dffffffff025d360100000000001976a91478364a559841329304188cd791ad9dabbb2a3fdb88ac605b0300000000001976a914064e0aa817486573f4c2de09f927697e1e6f233f88ac00000000';

        const result = TransactionService.decodeTransactionHex(hex);
        expect(result.version).toBe(1);
        expect(result.locktime).toBe(0);
        expect(result.inputs.length).toBe(1);
        expect(result.outputs.length).toBe(2);
        expect(result.inputs[0].txid).toBe(
            'd0a5c375a1ef1fba5f241ccbc764a71ec9bcbfa98257b4e3f124470e3be4dd04',
        );
        expect(result.inputs[0].sequence).toBe(4294967295);
    });

    it('should convert script hex to ASM', () => {
        const hex1 = '76a91478364a559841329304188cd791ad9dabbb2a3fdb88ac';
        const hex2 = '010101029301038801027693010487';
        const result1 = TransactionService.scriptHexToASM(hex1);
        const result2 = TransactionService.scriptHexToASM(hex2);
        expect(result1).toBe(
            'OP_DUP OP_HASH160 78364a559841329304188cd791ad9dabbb2a3fdb OP_EQUALVERIFY OP_CHECKSIG',
        );
        expect(result2).toBe(
            'OP_1 OP_2 OP_ADD OP_3 OP_EQUALVERIFY OP_2 OP_DUP OP_ADD OP_4 OP_EQUAL',
        );
    });

    it('should generate the correct redeem script', () => {
        const preimage = 'Btrust Builders';
        const result = TransactionService.createRedeemScriptFromPreimage(preimage);
        const expectedScript =
            'a82016e05614526c1ebd3a170a430a1906a6484fdd203ab7ce6690a54938f5c44d7d87';
        expect(result).toBe(expectedScript);
    });

    it('should derive P2SH address', () => {
        const redeemScript =
            'a82016e05614526c1ebd3a170a430a1906a6484fdd203ab7ce6690a54938f5c44d7d87';
        const result = TransactionService.deriveP2SHAddress(redeemScript, networks.testnet);
        const expectedAddress = '2MwDHax5L9jXVGmnhN2YECEx63ickZaf7n9';
        expect(result).toBe(expectedAddress);
    });
});
