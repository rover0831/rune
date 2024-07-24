import networkConfig from "config/network.config";
import { getCurrentFeeRate, getUtxos, pushBTCpmt } from "./utils/mempool";
import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import dotenv from "dotenv";
import { redeemMergeUTXOPsbt, mergeUTXOPsbt } from "controller/utxo.common.merge.controller";
import { SeedWallet } from "utils/SeedWallet";
// import { WIFWallet } from 'utils/WIFWallet'

const sendAddress = 'tb1ppeacjnf6dmnhejchmlnne4ncm2z7xf447vmruq6htgglz3z55lzsax4mla';

interface IUtxo {
    txid: string;
    vout: number;
    value: number;
}

dotenv.config();
Bitcoin.initEccLib(ecc);

const networkType: string = networkConfig.networkType;
const seed: string = process.env.MNEMONIC as string;
// const privateKey: string = process.env.PRIVATE_KEY as string;

export const sendUtxo = async (sendAmount: number, sendAddress: string) => {
    const TESTNET_FEERATE = await getCurrentFeeRate();

    const wallet = new SeedWallet({ networkType: networkType, seed: seed });

    const utxos = await getUtxos(wallet.address, networkType);
    const sortUtxos = await quickSort(utxos);
    const sumArr: IUtxo[] = [];

    const data: { redeemFee: number | undefined, sumArr: IUtxo[] } = await getMinFee(sortUtxos, sumArr, sendAddress, sendAmount, 1000, wallet, TESTNET_FEERATE);

    let psbt = mergeUTXOPsbt(wallet, data.sumArr, networkType, sumArr.length, data.redeemFee, sendAddress, sendAmount);
    let signedPsbt = wallet.signPsbt(psbt, wallet.ecPair)

    const txHex = signedPsbt.extractTransaction().toHex();
    const txId = await pushBTCpmt(txHex, networkType);
    console.log(`Merge_UTXO_TxId=======> ${txId}`)
}

const quickSort = (arr: IUtxo[]): IUtxo[] => {
    if (arr.length <= 1) {
        return arr;
    }

    const pivot = arr[Math.floor(arr.length / 2)].value;
    const left: IUtxo[] = [];
    const right: IUtxo[] = [];
    const equal: IUtxo[] = [];

    for (const element of arr) {
        if (element.value < pivot) {
            left.push(element);
        } else if (element.value > pivot) {
            right.push(element);
        } else {
            equal.push(element);
        }
    }

    return [...quickSort(left), ...equal, ...quickSort(right)]
}

const getMinFee = (
    utxos: IUtxo[],
    sumArr: IUtxo[],
    receiveAddress: string,
    sendUtxoAmount: number,
    initialFee: number,
    wallet: SeedWallet,
    feeRate: number
): { redeemFee: number | undefined, sumArr: IUtxo[] } => {
    let sum: number = 0;
    for (let j = 0; j < sumArr.length; j++) {
        sum += sumArr[j].value;
    }

    if (sum < sendUtxoAmount + initialFee) {
        const utxo = utxos.find((utxo) => sum + utxo.value >= sendUtxoAmount + initialFee);
        if (utxo === undefined && utxos.length != 0) {
            const newSumArr = [...sumArr, utxos[utxos.length - 1 - sumArr.length]];
            const newUtxos = utxos.slice(0, -1);
            return getMinFee(newUtxos, newSumArr, receiveAddress, sendUtxoAmount, initialFee, wallet, feeRate);
        } else {
            const newSumArr = [...sumArr, utxo!];
            let redeemPsbt: Bitcoin.Psbt = redeemMergeUTXOPsbt(wallet, receiveAddress, sendUtxoAmount, newSumArr, networkType, newSumArr.length, initialFee);
            redeemPsbt = wallet.signPsbt(redeemPsbt, wallet.ecPair);
            let redeemFee: number = redeemPsbt.extractTransaction().virtualSize() * feeRate;

            if (redeemFee == initialFee) {
                return { redeemFee, sumArr: newSumArr };
            } else {
                return getMinFee(utxos, newSumArr, receiveAddress, sendUtxoAmount, redeemFee, wallet, feeRate);
            }
        }
    } else {
        let redeemPsbt: Bitcoin.Psbt = redeemMergeUTXOPsbt(wallet, receiveAddress, sendUtxoAmount, sumArr, networkType, sumArr.length, initialFee);
        redeemPsbt = wallet.signPsbt(redeemPsbt, wallet.ecPair);
        let redeemFee: number = redeemPsbt.extractTransaction().virtualSize() * feeRate;

        if (redeemFee == initialFee) {
            return { redeemFee, sumArr };
        } else {
            return getMinFee(utxos, sumArr, receiveAddress, sendUtxoAmount, redeemFee, wallet, feeRate);
        }
    }
};