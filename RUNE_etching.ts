import {
  Transaction,
  script,
  Psbt,
  address as Address,
  initEccLib,
  networks,
  Signer as BTCSigner,
  crypto,
  payments,
} from "bitcoinjs-lib";
import { Taptree } from "bitcoinjs-lib/src/types";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import axios, { AxiosResponse } from "axios";
import {
  Rune,
  RuneId,
  Runestone,
  EtchInscription,
  none,
  some,
  Terms,
  Range,
  Etching,
} from "runelib";
import networkConfig from "config/network.config";

import { SeedWallet } from "utils/SeedWallet";
import { WIFWallet } from 'utils/WIFWallet'
import { sendUtxo } from "Several_UTXO_send";
import { getCurrentFeeRate } from "utils/mempool";

interface IUTXO {
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

initEccLib(ecc as any);
declare const window: any;
const ECPair: ECPairAPI = ECPairFactory(ecc);
const network = networks.testnet;
const networkType: string = networkConfig.networkType;

const recieveAddress = "tb1ppeacjnf6dmnhejchmlnne4ncm2z7xf447vmruq6htgglz3z55lzsax4mla";

// const seed: string = process.env.MNEMONIC as string;
// const wallet = new SeedWallet({ networkType: networkType, seed: seed });

const privateKey: string = process.env.PRIVATE_KEY as string;
const wallet = new WIFWallet({ networkType: networkType, privateKey: privateKey });

async function etching() {
  const TESTNET_FEERATE = await getCurrentFeeRate();

  const initialFee: number = 40000;

  const name = "HARMONITECH•RESURSIVE•RUNE";

  const keyPair = wallet.ecPair;

  const ins = new EtchInscription();

  const HTMLContent = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Build Your Own Recursive Ordinal</title>
    </head>
    <body style="margin: 0px">
      <div>
        <img style="width:100%;margin:0px" src="/content/0e7ada8af1399f417e6a71eec3830cc9a048cfdc265e41cb6405d513eee9d971i0" />
      </div>
    </body>
  </html>`;

  ins.setContent("text/html;charset=utf-8", Buffer.from(HTMLContent, "utf8"));
  ins.setRune(name);

  const etching_script_asm = `${toXOnly(keyPair.publicKey).toString(
    "hex"
  )} OP_CHECKSIG`;
  const etching_script = Buffer.concat([
    script.fromASM(etching_script_asm),
    ins.encipher(),
  ]);

  const scriptTree: Taptree = {
    output: etching_script,
  };

  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    scriptTree,
    network,
  });

  const etching_redeem = {
    output: etching_script,
    redeemVersion: 192,
  };

  const etching_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    scriptTree,
    redeem: etching_redeem,
    network,
  });

  const address = script_p2tr.address ?? "";
  console.log("send coin to address", address);
  
  const random_txId = "995a96640e7877ffdb93ea73993d4ca483d8b68e1ab9d8b6c60cc1f654969f46";

  const fakeUtxo: IUTXO = {
    txid: random_txId,
    vout: 0,
    status: {
      confirmed: true,
      block_height: 2869229,
      block_hash: '000000005a405c22ee1a0366caddc43dc34365b1d7b0e348650938f5ee7c76b0',
      block_time: 1721518516,
    },
    value: 1000000,
  }
  
  // calculate inscription fee
  let redeemMinFee: number | undefined = getMinIspFee(fakeUtxo, wallet, TESTNET_FEERATE, initialFee);

  sendUtxo(redeemMinFee!, address);

  // const utxos = await waitUntilUTXO(address as string);
  // console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}:${utxos[0].value}`);

  // const psbt = new Psbt({ network });

  // psbt.addInput({
  //   hash: utxos[0].txid,
  //   index: utxos[0].vout,
  //   witnessUtxo: { value: utxos[0].value, script: script_p2tr.output! },
  //   tapLeafScript: [
  //     {
  //       leafVersion: etching_redeem.redeemVersion,
  //       script: etching_redeem.output,
  //       controlBlock: etching_p2tr.witness![etching_p2tr.witness!.length - 1],
  //     },
  //   ],
  // });

  // const rune = Rune.fromName(name);
  
  // const terms = new Terms(
  //   1000,
  //   10000,
  //   new Range(none(), none()),
  //   new Range(none(), none())
  // );
  
  // const etching = new Etching(
  //   some(1),
  //   some(1000000),
  //   some(rune),
  //   none(),
  //   some("$"),
  //   some(terms),
  //   true
  // );
  
  // const stone = new Runestone([], some(etching), none(), none());
  
  // psbt.addOutput({
  //   script: stone.encipher(),
  //   value: 0,
  // });
  
  // const change = utxos[0].value - 546 - redeemMinFee!;

  // psbt.addOutput({
  //   address: recieveAddress, // change address
  //   value: 546,
  // });

  // psbt.addOutput({
  //   address: wallet.address, // change address
  //   value: change,
  // });

  // await signAndSend(keyPair, psbt, address as string);
}

const makeFakePsbt = (address: string, utxo: IUTXO, initialFee: number) => {
  
  const name = "HARMONITECH•RESURSIVE•RUNE";

  const keyPair = wallet.ecPair;

  const ins = new EtchInscription();

  const HTMLContent = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Build Your Own Recursive Ordinal</title>
    </head>
    <body style="margin: 0px">
      <div>
        <img style="width:100%;margin:0px" src="/content/0e7ada8af1399f417e6a71eec3830cc9a048cfdc265e41cb6405d513eee9d971i0" />
      </div>
    </body>
  </html>`;

  ins.setContent("text/html;charset=utf-8", Buffer.from(HTMLContent, "utf8"));
  ins.setRune(name);

  const etching_script_asm = `${toXOnly(keyPair.publicKey).toString(
    "hex"
  )} OP_CHECKSIG`;
  const etching_script = Buffer.concat([
    script.fromASM(etching_script_asm),
    ins.encipher(),
  ]);

  const scriptTree: Taptree = {
    output: etching_script,
  };

  const script_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    scriptTree,
    network,
  });

  const etching_redeem = {
    output: etching_script,
    redeemVersion: 192,
  };

  const etching_p2tr = payments.p2tr({
    internalPubkey: toXOnly(keyPair.publicKey),
    scriptTree,
    redeem: etching_redeem,
    network,
  });

  const psbt = new Psbt({ network });

  psbt.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    tapInternalKey: toXOnly(keyPair.publicKey),
    witnessUtxo: { value: utxo.value, script: script_p2tr.output! },
    tapLeafScript: [
      {
        leafVersion: etching_redeem.redeemVersion,
        script: etching_redeem.output,
        controlBlock: etching_p2tr.witness![etching_p2tr.witness!.length - 1],
      },
    ],
  });

  const rune = Rune.fromName(name);
  
  const terms = new Terms(
    1000,
    10000,
    new Range(none(), none()),
    new Range(none(), none())
  );
  
  const etching = new Etching(
    some(1),
    some(1000000),
    some(rune),
    none(),
    some("$"),
    some(terms),
    true
  );
  
  const stone = new Runestone([], some(etching), none(), none());
  
  psbt.addOutput({
    script: stone.encipher(),
    value: 0,
  });

  const change = utxo.value - 546 - initialFee;
  

  psbt.addOutput({
    address: address, //Destination Address
    value: 546,
  });

  psbt.addOutput({
    address: wallet.address, // Change address
    value: change,
  });

  return psbt;
}

const getMinIspFee = (utxo: IUTXO, wallet: WIFWallet, feeRate: number, initialFee: number): number | undefined => {
  const keyPair = wallet.ecPair;
  let redeemPsbt = makeFakePsbt(wallet.address, utxo, initialFee);
  redeemPsbt.signInput(0, keyPair);
  redeemPsbt.finalizeAllInputs();
  console.log("virt: ", redeemPsbt.extractTransaction().virtualSize())
  let redeemFee = redeemPsbt.extractTransaction().virtualSize() * feeRate;
  console.log("fee: ", redeemFee)

  if (redeemFee == initialFee) {
    return redeemFee;
  } else {
    getMinIspFee(utxo, wallet, feeRate, redeemFee);
  }
}

// main
etching();

const blockstream = new axios.Axios({
  baseURL: `https://mempool.space/testnet/api`,
});

export async function waitUntilUTXO(address: string) {
  return new Promise<IUTXO[]>((resolve, reject) => {
    let intervalId: any;
    const checkForUtxo = async () => {
      try {
        const response: AxiosResponse<string> = await blockstream.get(
          `/address/${address}/utxo`
        );
        const data: IUTXO[] = response.data
          ? JSON.parse(response.data)
          : undefined;
        console.log(data);
        if (data.length > 0) {
          resolve(data);
          clearInterval(intervalId);
        }
      } catch (error) {
        reject(error);
        clearInterval(intervalId);
      }
    };
    intervalId = setInterval(checkForUtxo, 5000);
  });
}

export async function getTx(id: string): Promise<string> {
  const response: AxiosResponse<string> = await blockstream.get(
    `/tx/${id}/hex`
  );
  return response.data;
}

export async function signAndSend(
  keyPair: BTCSigner,
  psbt: Psbt,
  address: string
) {
  if (process.env.NODE) {
    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
    console.log(tx.virtualSize())
    const txid = await broadcast(tx.toHex());
    console.log(`Success! Txid is ${txid}`);
  } else {
    // in browser

    try {
      let res = await window.unisat.signPsbt(psbt.toHex(), {
        toSignInputs: [
          {
            index: 0,
            address: address,
          },
        ],
      });

      console.log("signed psbt", res);

      res = await window.unisat.pushPsbt(res);

      console.log("txid", res);
    } catch (e) {
      console.log(e);
    }
  }
}

export async function broadcast(txHex: string) {
  const response: AxiosResponse<string> = await blockstream.post("/tx", txHex);
  return response.data;
}

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  );
}

function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33);
}

function tweakSigner(signer: BTCSigner, opts: any = {}): BTCSigner {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!;
  if (!privateKey) {
    throw new Error("Private key is required for tweaking signer!");
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey);
  }

  const tweakedPrivateKey = ecc.privateAdd(
    privateKey,
    tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
  );
  if (!tweakedPrivateKey) {
    throw new Error("Invalid tweaked private key!");
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  });
}