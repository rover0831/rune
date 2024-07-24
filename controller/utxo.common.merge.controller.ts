import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { WIFWallet } from "utils/WIFWallet";
Bitcoin.initEccLib(ecc);

interface IUtxo {
    txid: string;
    vout: number;
    value: number;
}

export const redeemMergeUTXOPsbt = (wallet: any, receiveAddress: string, receiveAmount: number, utxos: IUtxo[], networkType: string, mergeCount: number, fee: number): Bitcoin.Psbt => {
    let value = 0;

    const psbt = new Bitcoin.Psbt({
        network: networkType == "testnet" ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin
    });
    for (let i = 0; i < mergeCount; i++) {
        psbt.addInput({
            hash: utxos[i].txid,
            index: utxos[i].vout,
            witnessUtxo: {
                value: utxos[i].value,
                script: wallet.output,
            },
            tapInternalKey: Buffer.from(wallet.publicKey, "hex").subarray(1, 33),
        });
        value += utxos[i].value;
    }

    psbt.addOutput({
        address: receiveAddress,
        value: receiveAmount,
    });

    psbt.addOutput({
        address: wallet.address,
        value: value - receiveAmount - fee
    })

    return psbt;
}

export const mergeUTXOPsbt = (wallet: any, utxos: IUtxo[], networkType: string, mergeCount: number, fee: number, receiveAddress: string, receiveAmount: number): Bitcoin.Psbt => {
    let value = 0;

    const psbt = new Bitcoin.Psbt({
        network: networkType == "testnet" ? Bitcoin.networks.testnet : Bitcoin.networks.bitcoin
    });
    for (let i = 0; i < mergeCount; i++) {
        psbt.addInput({
            hash: utxos[i].txid,
            index: utxos[i].vout,
            witnessUtxo: {
                value: utxos[i].value,
                script: wallet.output,
            },
            tapInternalKey: Buffer.from(wallet.publicKey, "hex").subarray(1, 33),
        });
        value += utxos[i].value;
    }

    psbt.addOutput({
        address: receiveAddress,
        value: receiveAmount,
    });

    psbt.addOutput({
        address: wallet.address,
        value: value - receiveAmount - fee
    })

    if (value < fee) throw new Error("No enough Fee");
    
    return psbt;
}
