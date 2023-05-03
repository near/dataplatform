import React, { useEffect, useState, useCallback } from "react";
import MonacoEditor, { DiffEditor } from "@monaco-editor/react";
import { formatSQL, formatIndexingCode } from "../../utils/formatters";
import { queryIndexerFunctionDetails } from "../../utils/queryIndexerFunction";
import {
  Button,
  Alert,
  Modal,
  ButtonGroup,
  ButtonToolbar,
  Form,
  InputGroup,
  ToggleButtonGroup,
  ToggleButton,
} from "react-bootstrap";
import Switch from "react-switch";
import primitives from "!!raw-loader!../../../primitives.d.ts";
import IndexerDetailsGroup from "../Form/IndexerDetailsGroup.js";
import BlockHeightOptions from "../Form/BlockHeightOptionsInputGroup.js";
import GraphiQL from "graphiql";
import { JsonViewer } from "@textea/json-viewer";
import "graphiql/graphiql.min.css";
import { request, useInitialPayload, sessionStorage } from "near-social-bridge";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { mockInitialPayload } from "near-social-bridge";

mockInitialPayload({
  height: 1200,
});

const block_details = {
  block: {
    author: "continue.poolv1.near",
    chunks: [
      {
        balanceBurnt: "1486252472505500000000",
        chunkHash: "3qxSWuuo5QLdgpYSuwtQcAcAoX91b6p55CLxjda2wNNw",
        encodedLength: 1772,
        encodedMerkleRoot: "ChpbnZdB2NdSaC2ir443zB4Bv6WUMSDBY6n3RfDyEVs",
        gasLimit: 1000000000000000,
        gasUsed: 16028665261860,
        heightCreated: 85376002,
        heightIncluded: 85376002,
        outcomeRoot: "G5c89nTRQSRYPdJQFcP47YXccbmbrbutNwLZzKUeRG3f",
        outgoingReceiptsRoot: "5GrcVRVw9njFAskhcEbUyPZAoKMEEjGnC6edUhupEDkj",
        prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
        prevStateRoot: "CRaTBLfd55cw6i5GfVvVSo1rw5ioZ91hT3ZVo5eBmNCi",
        rentPaid: "0",
        shardId: 0,
        signature:
          "ed25519:4Fzq1idZFShNtErzbK5uZWDcnWhHTMshVBvXG9c8cvc3YPkHF8SVgRsMym6V3WNHVY29gNaw1kXPCLBApcZ2bA1h",
        txRoot: "5uqwhjC7wRJsvidh7gjtRRPvvUVwyefdQCivBMTL1hak",
        validatorProposals: [],
        validatorReward: "0",
      },
      {
        balanceBurnt: "1433581134734200000000",
        chunkHash: "BqfFW2NyLJuyp1pGgXd2ffYPGptNswNVH6ZJuTq5zSNa",
        encodedLength: 161,
        encodedMerkleRoot: "EB5tG2a3aVfXv41ESuQVT1ZvQFvuwKnkYGLc2CDVCf5w",
        gasLimit: 1000000000000000,
        gasUsed: 19438956235189,
        heightCreated: 85376002,
        heightIncluded: 85376002,
        outcomeRoot: "Cp7GeqLAqZ1Z1GbtCL5nG13wxy6mV6PaRdwLddDHjhVc",
        outgoingReceiptsRoot: "DP1DT6QP1tNHM5ZjHMJ3C8G2mHJd8kGoFFNEdZPN8Hyx",
        prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
        prevStateRoot: "73sn3JyP1LU58r1FsTo5ZVgvErdbEGFxtiGExkWwhQUd",
        rentPaid: "0",
        shardId: 1,
        signature:
          "ed25519:3RYj6fpboT1ALHsVxYtYmofT8fGf1VRhNaJhWY45hsKdePcX3AZb3rdKBAZMThF5PVn5j5boKWHPb9zd1xZWYzex",
        txRoot: "11111111111111111111111111111111",
        validatorProposals: [],
        validatorReward: "0",
      },
      {
        balanceBurnt: "242806857164400000000",
        chunkHash: "6uDUqFuYwGohFMQ9UyRaHbmHALf8HS9F6WcNnZWypkka",
        encodedLength: 1474,
        encodedMerkleRoot: "9rtC25N5jqfLxMumUwvupL9MpMNUAEKuXZB8RmfkdD7p",
        gasLimit: 1000000000000000,
        gasUsed: 2428068571644,
        heightCreated: 85376002,
        heightIncluded: 85376002,
        outcomeRoot: "AvRw1DBT1JFB2KNuahMvYucvttrem74GSEnwMacxbkv6",
        outgoingReceiptsRoot: "C2QjTGsH8HcfR6W7ecLYwuYD3Vkw6mi9Pf9tFXuGdMLr",
        prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
        prevStateRoot: "CtxzDGCGs1SAr7GEqrA8gSKCcbaPDMKegnTyPEJmU7mb",
        rentPaid: "0",
        shardId: 2,
        signature:
          "ed25519:66LFkWB13BEUYRsmockx9LbiBzko9zohGkfbLwJertYWAa5TJY5ELFxPycps6poroh1C7Tfbh6NH7tQpgHZFr43d",
        txRoot: "DVr9U4uYvJY1cz5awdSmKm4CovJmr1VcPyqCMonat8bD",
        validatorProposals: [],
        validatorReward: "0",
      },
      {
        balanceBurnt: "599537042985400000000",
        chunkHash: "3Q39LzrowGBhqRZvkjDqQNjkfUEYEK6Zis5LUzqvrtFj",
        encodedLength: 1837,
        encodedMerkleRoot: "2d1EBsn1UspGLYjyFkrzPoawjghZe4fBbWkZfmsPJRbM",
        gasLimit: 1000000000000000,
        gasUsed: 7599093905353,
        heightCreated: 85376002,
        heightIncluded: 85376002,
        outcomeRoot: "CUmJsZfPtNYEggezXf6wW7NX2i7Vn9yuPz7RWfVKxR7p",
        outgoingReceiptsRoot: "8TG5j9ahcEtGUNREhCEJW3SgHyeCzochf4foYxSU7b8Q",
        prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
        prevStateRoot: "EPbgnc5qJFvFGqqAyQQu2SrFcVr6mr3AVbSuXnHvZ1ie",
        rentPaid: "0",
        shardId: 3,
        signature:
          "ed25519:RgPmNaXij3pNFdMVi1Ex8WXyQiYr12uUyRk5tuoddJvCTwJXcxQZZLCdy1XqB6uB9imMz9NsXQwT1M993NBMsjS",
        txRoot: "8V1iVH9TSzWsPtNVorScHc4ha9ESNqNEG13tZiRSDzk7",
        validatorProposals: [],
        validatorReward: "0",
      },
    ],
    header: {
      approvals: [
        "ed25519:3XJG7eriCesmFBP78Q6iECzr34boAvEKn1nMintoQyf8MGf6TUzkjH91jvnb3putUvCicXDzgQjYrjbqTrgQZdTB",
        "ed25519:238a4WVjhbpubpMhMi2wKzR6wjoVLZ7788KPE3a3RzkppLzd22CChmEHHEyqsFj5VpWFVr13iTmgcgh2MomMxhxQ",
        null,
        "ed25519:3hE7715teaeQE2UNWuZy9T6B7yA833NeBZuEsfYnHWGmGvQtApVwyX5QsVF1NV8cT24yQTus1u98JPjUr3X1XBdG",
        "ed25519:2JFfKfhtZFLrqNHSKWfojnQ63986w9BDVckL88ny3wzmEgextjkvAAmg12EjsmCwXUdc2VZ6zFBwto2pMVSovHcE",
        "ed25519:3V28c6KbuvuV21W5h8AsbjfZYQXA7aPJEsBi97xpJWAtULikSqqjSVhoLk6ckiAhG83G2nUWc12M8bcroyRB9Lso",
        "ed25519:5rp3ZGsLKo6oHrUix29cEDdfMAeiWuPmaQEh4T22pCPFEGMQ4jf5WRG8PZKv8zKGeia7NJrWy5iR88k2KF554c7A",
        "ed25519:2is1ybPjjGhJGJx7BTWbtXVbQNauwEAZLywtZFGrjLPyXdekxGqG695K3W9q7xnfCJYEXzUxpcANhcL1viG7fG3F",
        "ed25519:3h8Bx2e8Zb5wRw9Cph29FGm1pvWhopqSfbWzQeeawQAssSAd2fcy32yJGtZabHtLp2VRRznv6CgotS4Cc2JWRjUR",
        "ed25519:v7cD1AUXxnqamFqZU3mg3h7zAx6rWZvWARsZhCc28zAHrTM3YgEJiEJCbqcTDtRRCxC2uyBwzzmZftaDum8p5Py",
        "ed25519:5VDMQYTp59pwJ1eVHjcFSUeQnmnkBC9F8jEHwjxoJb1YewM8VAgQCb718r4EpV9Z41MHW57i9H3gP9JHSWJiZUL2",
        "ed25519:2zwMz7w2MJHpg8F4G9AAu5UEy6Yo2TFw1VGFCAUsQrP3WwGDwUbsCR63Y88M9v4aWFdyr38no6yzd2DEsrQQCq7b",
        "ed25519:3M3cA2X1DqWdiELg7PKuFDf8u9MJC2rNhiHccZBYJxZcvKeomgRhGLcgjniEiAmC4uaYq86ePKY7e68smydbXRFr",
        "ed25519:5hX41Uom35xmLD5pTVaxEXzzQMJiS5Vi4Eyd3bBHcd2dKbE4g49AyCmCJ3Mpqr1xEEMsWGKtcLAFpAkhEyiTS73H",
        "ed25519:42kqMAMQdA1b1No1PhLwp8FL2g789vkwHTshiHLjvqSfJ4t6B8krevBj3Z2AmeEYduGMZGNaMcDmFG43vifoX15F",
        null,
        "ed25519:4AxJBk1cK9sqHwP4F32KQ21tj37kroBqMyesqXy2ksF8MWmXpxC3R2UKwFJRp3EztNaD8EM2vy7oFRmdumZcM2Gf",
        "ed25519:3KJDnpo4vxwyBDE11AWVRrnyGh9fYgq1GrsinEUKdwkVSCGKGv3rQrm19y5drxZEsqRw39D1bws1scc1TniCv1AX",
        "ed25519:PapbiGeqfur5csDNK3C9Cky6eLUQxzQXDPmE441MqFv5x1VDmEe2ZqHQecjiU6p18o1sQMGwgMARQZxHFDenYLB",
        "ed25519:57Pz4cEpBK2WCMnSaqt4jswZ4QYyhcRx1xG9pD44mp8mLCG3ogJhrq23eFF2xMizUzEDSD7AVMG1tByRob8VCZYm",
        null,
        null,
        "ed25519:5qNA6byTPhr6GHyTGxEZfRX12tYbqiYy7dQ4kdZVx4PW3i7s5i4q3ZUmwqP5rq6bdxx5fGkdMUVc3sqomz2dErE7",
        "ed25519:5YcgeAxawhVaTnvuRTWbPCtDtS6NH2UrNjeXcn89eXbKHTqeWtHsXKAb1NptrLgKr8K5WUGXjTKicz1xJyv9HgNh",
        "ed25519:sqZFxPtQpBnWUzcuPJeQUqyp3z3vYDYYe7Fvgcu4pVA46ueaU1oyTBpoMakY7pkZGyPq4jmgEamS3Bupf1W8KW3",
        null,
        null,
        null,
        null,
        null,
        "ed25519:291jQZp5NAeogGttS75JYoqaenVKkQHP8M1YXSB8kpB2UJWN4wn7CCPZUxSPPSsPYmvYfpX3pkrxhJ7gAms9h743",
        null,
        "ed25519:W2igco7sqdc9am1aVYA59yfPUVCJ8v4y6G5GAgfN9xpHy9r5QCKmatHpVJ6FMzinhy9GkCiZ3qJizbQBSWScwcP",
        null,
        "ed25519:4q7PyxNTZtEdoSQf4azWVmXVs851JH9aYJc9B2H67AdkmM5sBz2gDFce1b9c36xWccUtf7cDDGBE6YPAf5eELax6",
        "ed25519:3ECDJscq5C3JLy6XeqAX5qKSvk8KXRjucJPjCiTW7vLmwb5C1MHR8VUZa6ufpN5chHMgFie2L4D82nMuPABPkXmz",
        "ed25519:29VK9ikBVSp2ZDBKhLDXC4QbA3XXAp5gdMRvVtANNDW29M6boo939HXpwhazhVSJydft8x4WFNfrJUykGrPHtQi6",
        null,
        null,
        null,
        null,
        "ed25519:5nUAvGput21GYcbAYuPncCvhyMSQuoKD2eLxb3pUVhLcPyYCxETWwtY4k5AL1p5aR7c9aBG1cfEqUXRB99Y2zwYJ",
        "ed25519:3mae6hCDVnY1WrV1N74xnTkvN5ihTn8Y9SKUPY32zS4jpqJWKzdopgX7KZniiFkC41JhD4vQjWwKChvxfaztBKq6",
        null,
        "ed25519:5XjF6gyHudHwy3b48eGsED47myBjxB2dxvYZG2m954eQquMyLcVwKRZJvAXbzbHKehXUP8r9eeL3rm2LriYsx1dD",
        "ed25519:5vtjieSMvoYXYYP3zit9x6Dd7qVRDPYmoBZfELvouSX5ur9dnHmUnjEAXsWSWB69obm6hnfJz1Bx5gkXjLvyen3X",
        null,
        null,
        null,
        "ed25519:3WK1bgn3qqzSiZcEphbKcw6UajNSDdLSYeGYMSMGH4YMdS7FnFKAhdigotRZ8z32adAzZp1URjd39yBHBibJVnDJ",
        "ed25519:3hkDFUQhi9pDWKtb6YtcuFy56QY9CkhAKvEwrg99wFYtmcYicN5N3tSu3bSKpFFEWop3qsvr5rCc3zWwkqKVT2nb",
        null,
        "ed25519:rpALm3QcZov6qnDscsyyKwtgLSXVjppugEgM1DAzMw6Ewk2ovVAtow5frCV7nc1umnDLuxfLSfRNxkjeDqgAr4S",
        "ed25519:282Bw4icWLoUEAa6KUmixVeGSjjt6o1GAMcLypc1ruCqneENnzPC9hVqUWWGe9PmHU6GCEDoe79Y8hGpP9GuDYdA",
        "ed25519:2JQENivaSR9iDsbEXB3gz6PdqBiNbWRKU1e9XvcChzwtHp3gcCMW6Gnr362ktodDcjtcxZzyR4mHKBgREm2iRDJC",
        null,
        "ed25519:35ffy6YAW7V1VSF1XcYNQUXnQxgYyNpsaUWEF3Gu7LgijZkdFqVdbPxfQpKCntWuC3LLrb8Vs1a3WNHgmEcub4Ng",
        null,
        null,
        "ed25519:53swEewwpM15AN4uBW3DPSdX4VTcx7XvP7d7LZNtxDga7JnNXZXVYJeNw31ui9LB1ffnHMNyAFoiQMLm5bnPQcsq",
        "ed25519:3Wb7R4K6DXA3o3DDAEwaYNY72SwqUadjqesMYvq9cmhoHm2UtyDMp1wPWCWMLQ4BfrshGdMgryvSn8cpeiVuv5HN",
        null,
        "ed25519:5gGB9iTkt31SvAYaR52WfYf51uhhUb3CTf9RDN3MXoD3VR4m8fwBgRpmeu2Txb1RQJCwczxfYByYuRJR3orKkXA",
        "ed25519:2L7h92UaYwSXGBTqVkuhpRKZwRpW2wB7568U6jcBnH3iQtj71jERJdAtru62dx17teRngxJjDzMAG2Hs273Nt4cn",
        "ed25519:DL2QVuWC6CWrr519nQiKRtgC2H59ebBKNb5MjAKyv64zF3VrguWKQCcfaRUGgugiVeUjx12m2QfQigHmrqHWPmi",
        "ed25519:2uRyW8QrTaxdeX11tKxFmCY1FZbHbz7iWKxrNzGV9jiJg56BJgRKSZKbFpzPTakWMsesUfUUq4HNB4YsE6pvJSsN",
        "ed25519:2JB1CzirhvYfDVhay5jdzW5zGhGCLftfAB2Ff1ByNRnrvN7osvswuzLGHYDbmdMPdhC1ZTqeNCmKnQHzqQxKSjzN",
        null,
        "ed25519:4YNGqdPNKGGDcuWAnW1DFJfJ6Qeqz5wh7rGLj7gSK2jXYUh9vnuXcKoC2fBWsTKtfawncDyKE7sAfW3THaSqrDDM",
        null,
        null,
        null,
        null,
        "ed25519:KhbmAUdmHgTuVkUsBX2PdbPsLgKMtr8ds7pWrb1otn5dKidQJc8Vdtq5MBZUrn6pRL2d96YWL9jxTBpgBqrbn2M",
        null,
        "ed25519:MZT25bZDDxDJP4CRhyTK17Qfr8oWroVdyRuTccpA3Ynhf3PwB1WcC31XwugD6L5LCtMU1hyCPbE16bk7NksHhHC",
        null,
        "ed25519:2BWXNtCGqwLG9yu8KkRnT1tui8GcynBN5DrhtfNQtFotSHphtABu1iNucrd82aPTegFogSMDA2cvhhrgpu4SRevc",
        null,
        "ed25519:4EFt6q2MUjvcvZrCFXY2amqBcd36gKezF3FFHWsGwtJcqbH4brTHMH5THio3pXFYCWY8mtQTpLZ9SnPUWDyVKxnA",
        "ed25519:57js3GUGprV3Rc5Aci4Ws2JciuuWMhmApPPmyhYJXcz67LuwTT4KCnhFNZYDzGnV2ueP1irNUFFUXhC6HXa7amUQ",
        null,
        "ed25519:2uJEgTHUV1qSLLDSjuA6NBDdJur5Xh9wKQ9sHWmpwpePyknc93J64YVZxnidG2EDAKVBSDm9kpBndMXGNEXjqEew",
        "ed25519:BzXpv857MvdsUkgCdZRAspbAhrKqibxXs7JqSt2KkzjCm9JgsxiCGf5GJCYC3gV3NJfC4p6zst8UYezQ43LAkT1",
        "ed25519:3hX4uGLHK2GRCTng7SBazenaXxSHSscJyRCKgUpKiQfHMJ7BsVvJb9obJfSNN3ynfCNmRtoUiB3tE46xHKqZ73rt",
        null,
        "ed25519:2VyXyzSMCS6nzA2rDVwoZJLt2k1Zx3c4wQMx15SBx3mYbjevfdt6ErHH4GvF7PMqnXAUEgCTzWoJ54NeV5nWbM9b",
        null,
        "ed25519:2FURA8ZJGN7gTtoaGgYvNkQE46rNLmrwSqqNVhzevUg3MP6GNt821vqMpsfrR5t7mFy5pk5inzrWYZcELZw5LHKz",
        null,
        "ed25519:3JHQcPV1nTLsqSTboA4NavexkhmYxDsiDun49KFVEZQRuxoNHuigJL1jBW78T4nRRPPowESosCZgmpgsWDb5UDAK",
        "ed25519:2yqmma3px8io4Dd7ezg5H5d3C4Rueyi3aok9agpzpowU4vPxj2Y58h3Mu2qPSYBUtT75DgEcTtiZaMjQsBMfjCj7",
        null,
        "ed25519:647bt2zPCma9kZqZmaR4HshKrERRUiFg3KT1G6S5aeowmoELvLhHcwZyAki4hW8BtgdW5GuEu2pPRXFsoTbEcASC",
        null,
        "ed25519:4kv1RTxeFCRxc6shxqwfmmL398dJDGjKvFPn9PuaJJoFZTBkkFDaNuMDagoBrfgZYBhb7eZ26vKAoPK3vBVUGZgp",
        "ed25519:4P183Ceq88jLBs1cKoANgrmTBDCsvbJVRYgBH4iYyK76bYrw795DkgMaQKsWo3ZFjMHH3fC9nZ8C4WNLwkJZVfE4",
        "ed25519:CbQsnkfYhEZ32hfTrj4d4MYd4duFep6zY1cqRUFqt74WtxQHWU4mVL4qoxgvQgfeWPLiev9FRVaFLK4VnL9jYsZ",
        "ed25519:4kFsUdepZzP9oVCYWdzNq3iHURJdNn9GHj4gJgeaHPVWFpbue52zagJpmh4hsNjhDXX5tkL3TQzcd5HTWjNcqgDC",
        null,
      ],
      blockMerkleRoot: "FYpXxjbPZ5FoB57ZcPMvvs94x52wbCJdhxYs6qnGaZsm",
      blockOrdinal: 75337992,
      challengesResult: [],
      challengesRoot: "11111111111111111111111111111111",
      chunkHeadersRoot: "5AzFQd9Ds8yWynns4B4TFFcBGSh24ze2jApisECRYEib",
      chunkMask: [true, true, true, true],
      chunkReceiptsRoot: "CsBRzd4FJe8Qr22wDkQXtxaVs5z2Jmrk2ZQC1PBrHRoV",
      chunkTxRoot: "9DwCvRfUYzaxHCjWEWDR3WxJfn9gPoignTYXmEN9D6wC",
      chunksIncluded: 4,
      epochId: "4GoC7oSPLfaXo3Gz9z2Rkb86nN1fM8qVd578gTAmf1fn",
      epochSyncDataHash: null,
      gasPrice: "100000000",
      hash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
      height: 85376002,
      lastDsFinalBlock: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
      lastFinalBlock: "C3KNVyUKZ8uR166dc5vUKPQdsW5CL2mn4oerbMQFcQp5",
      latestProtocolVersion: 58,
      nextBpHash: "5BaNTEgDB11HxTGNKvQRJSytiv6ZM73YrJjxBymYau7",
      nextEpochId: "3jvt2LuA1LZGQwKtbcThcjT4twe4juCfqwSEiuktBrqH",
      outcomeRoot: "5dDKr6oN9bh1bxePyq2HbAWTA792ZRQSvfvcmTTrySi9",
      prevHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
      prevHeight: 85376001,
      prevStateRoot: "6Y3XsdVvhHj3wcGVbXNQNg3qh46HHQA5FPKUoigHPVYr",
      randomValue: "3SPgojnHE7CFj7bue5w8CsYDvg5Ffskue8qPDZohqQJh",
      rentPaid: "0",
      signature:
        "ed25519:5kjuiCWar11gt9BSRncbEaUnwoL1Nx5tzdnxrnBzgWhjHdfH2QfDajYqdy4bkXaU3UJ6TQDGcLz7pPiNLR3mmnQS",
      timestamp: 1676579182274205000,
      timestampNanosec: "1676579182274204901",
      totalSupply: "1121201720917794037313140715777439",
      validatorProposals: [],
      validatorReward: "0",
    },
  },
  shards: [
    {
      chunk: {
        author: "figment.poolv1.near",
        header: {
          balanceBurnt: "1486252472505500000000",
          chunkHash: "3qxSWuuo5QLdgpYSuwtQcAcAoX91b6p55CLxjda2wNNw",
          encodedLength: 1772,
          encodedMerkleRoot: "ChpbnZdB2NdSaC2ir443zB4Bv6WUMSDBY6n3RfDyEVs",
          gasLimit: 1000000000000000,
          gasUsed: 16028665261860,
          heightCreated: 85376002,
          heightIncluded: 85376002,
          outcomeRoot: "G5c89nTRQSRYPdJQFcP47YXccbmbrbutNwLZzKUeRG3f",
          outgoingReceiptsRoot: "5GrcVRVw9njFAskhcEbUyPZAoKMEEjGnC6edUhupEDkj",
          prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
          prevStateRoot: "CRaTBLfd55cw6i5GfVvVSo1rw5ioZ91hT3ZVo5eBmNCi",
          rentPaid: "0",
          shardId: 0,
          signature:
            "ed25519:4Fzq1idZFShNtErzbK5uZWDcnWhHTMshVBvXG9c8cvc3YPkHF8SVgRsMym6V3WNHVY29gNaw1kXPCLBApcZ2bA1h",
          txRoot: "5uqwhjC7wRJsvidh7gjtRRPvvUVwyefdQCivBMTL1hak",
          validatorProposals: [],
          validatorReward: "0",
        },
        receipts: [
          {
            predecessorId: "app.nearcrowd.near",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJhY2NvdW50X2lkIjoicmV6ZXJ2LTI5Lm5lYXIiLCJzb2x1dGlvbl9oYXNoIjpbMTY2LDIwNCw2NSw3NCwxMTksMiwyOSwzMywyMTMsMTA1LDE2OCw0LDE5NCwxNzksMTk3LDUyLDI0MSw1NSwxLDEwMSwxNTcsNjQsMTI0LDAsMTE4LDY3LDE4NywxMjEsMTMzLDQxLDIzOSwyNDNdfQ==",
                      deposit: "0",
                      gas: 200000000000000,
                      methodName: "approve_solution",
                    },
                  },
                ],
                gasPrice: "335989893",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "app.nearcrowd.near",
                signerPublicKey:
                  "ed25519:CXYkSHvK2rj6sCGbaKPbTtwhcMrPvWxs1ntVvA6vLtm2",
              },
            },
            receiptId: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            receiverId: "app.nearcrowd.near",
          },
          {
            predecessorId:
              "7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJyZWNlaXZlcl9pZCI6InJld2FyZC1vcHRpbi5zd2VhdCIsImFtb3VudCI6IjEwMDAwMDAwMDAwMDAwMDAwMCIsIm1lbW8iOiJzdzpyZXc6b3B0aW46WUdSV3ZncFhLMC03YThiYTFiZDgwNDg2Mzg4M2FjZTEwZWQ3NjQ0MWU2YWQyMjM5YWU3OTE3Yjc4Yzg5NzAwYjcwMWY3NWNlMWFiIn0=",
                      deposit: "1",
                      gas: 14000000000000,
                      methodName: "ft_transfer",
                    },
                  },
                ],
                gasPrice: "109272700",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId:
                  "7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab",
                signerPublicKey:
                  "ed25519:9FNEMP92rkuvRVefVkBW38RmbZ648XvQGeWbFYtdC7hk",
              },
            },
            receiptId: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            receiverId: "token.sweat",
          },
          {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "67682508099918060916120" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "app.nearcrowd.near",
                signerPublicKey:
                  "ed25519:6MP4bCPHEud33eKXM9kg7f9fVNhmn97CNUyn5ZwM375U",
              },
            },
            receiptId: "5GMwBgfhgASLVXkCsqMn2riVbByJPh2pmyxCeQmbHHWe",
            receiverId: "app.nearcrowd.near",
          },
          {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "13222602662027447938448" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "olezha4.near",
                signerPublicKey:
                  "ed25519:EnLNUDncRuw4AYLcGmi1Hr2YQ1DLu12VutsubZ6k8c2F",
              },
            },
            receiptId: "BpZGWvbmx8sAMRsrhWyBnC5QHA9mFwist7orTceJTRvu",
            receiverId: "olezha4.near",
          },
          {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "13239855304236542651168" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "marthacecilia.near",
                signerPublicKey:
                  "ed25519:8W28RYFfXztNA7ENP4VTaitsqEjSbABQJDqELwbwXswq",
              },
            },
            receiptId: "3R2wjnktLwBKaceGiPetmShVAyHT2LuoQZMdNg6oWMwK",
            receiverId: "marthacecilia.near",
          },
        ],
        transactions: [
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "3W8KnZUsb7Mb3SZk7yygL5F2L2C6djxZ3fVumodB2KQe",
                outcome: {
                  executorId: "app.nearcrowd.near",
                  gasBurnt: 2428314524384,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY"],
                  status: {
                    SuccessReceiptId:
                      "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
                  },
                  tokensBurnt: "242831452438400000000",
                },
                proof: [
                  {
                    direction: "Right",
                    hash: "8AS32PCfmnnsgkmrm2QH6ULKdTBS4o3EjcU2FZ34dTux",
                  },
                  {
                    direction: "Right",
                    hash: "8PVbKv5bqbBoTUkXbcQ8sWEYbUDKo8hv8S1JHKVrftCz",
                  },
                  {
                    direction: "Right",
                    hash: "8VRHTUKsUcZRDgrKizV5sup3Zvzg6reRacn3KmeUVY9n",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "eyJhY2NvdW50X2lkIjoicmV6ZXJ2LTI5Lm5lYXIiLCJzb2x1dGlvbl9oYXNoIjpbMTY2LDIwNCw2NSw3NCwxMTksMiwyOSwzMywyMTMsMTA1LDE2OCw0LDE5NCwxNzksMTk3LDUyLDI0MSw1NSwxLDEwMSwxNTcsNjQsMTI0LDAsMTE4LDY3LDE4NywxMjEsMTMzLDQxLDIzOSwyNDNdfQ==",
                    deposit: "0",
                    gas: 200000000000000,
                    methodName: "approve_solution",
                  },
                },
              ],
              hash: "3W8KnZUsb7Mb3SZk7yygL5F2L2C6djxZ3fVumodB2KQe",
              nonce: 43616777771952,
              publicKey: "ed25519:CXYkSHvK2rj6sCGbaKPbTtwhcMrPvWxs1ntVvA6vLtm2",
              receiverId: "app.nearcrowd.near",
              signature:
                "ed25519:5KcVvC1zzJZkk92uWzMoD9e2fvded6JdgUApuV6NDCcY7YEhzVtUQaVPomQ4ZpDydtUyZmgxTXcqaVp5c54wciEX",
              signerId: "app.nearcrowd.near",
            },
          },
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "3GYUTXHUQMH1kpccEms6yNVzckyAedUTWKPQpEN4tc5K",
                outcome: {
                  executorId:
                    "2fe75000c84efd3b64f88f61d88cd08c339b8c6654e6239f7d4e3592aa92c659",
                  gasBurnt: 2428312288450,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["7CmRnTXnY3LmX7PojrByXqZpirVNVSuHgL9k3uhbdKm1"],
                  status: {
                    SuccessReceiptId:
                      "7CmRnTXnY3LmX7PojrByXqZpirVNVSuHgL9k3uhbdKm1",
                  },
                  tokensBurnt: "242831228845000000000",
                },
                proof: [
                  {
                    direction: "Left",
                    hash: "5Bf7Pbbnwt6THJBxQ3mBkpc8WD2GBLoXrte6HYJZU6yh",
                  },
                  {
                    direction: "Right",
                    hash: "8PVbKv5bqbBoTUkXbcQ8sWEYbUDKo8hv8S1JHKVrftCz",
                  },
                  {
                    direction: "Right",
                    hash: "8VRHTUKsUcZRDgrKizV5sup3Zvzg6reRacn3KmeUVY9n",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "eyJyZWNlaXZlcl9pZCI6InJld2FyZC1vcHRpbi5zd2VhdCIsImFtb3VudCI6IjEwMDAwMDAwMDAwMDAwMDAwMCIsIm1lbW8iOiJzdzpyZXc6b3B0aW46WUdSV3ZncFhLMC0yZmU3NTAwMGM4NGVmZDNiNjRmODhmNjFkODhjZDA4YzMzOWI4YzY2NTRlNjIzOWY3ZDRlMzU5MmFhOTJjNjU5In0=",
                    deposit: "1",
                    gas: 14000000000000,
                    methodName: "ft_transfer",
                  },
                },
              ],
              hash: "3GYUTXHUQMH1kpccEms6yNVzckyAedUTWKPQpEN4tc5K",
              nonce: 70681752000024,
              publicKey: "ed25519:4Dzjg5EJX1RBYctnzmi1SNoq6fswSowsiWB5m3sEcC4Q",
              receiverId: "token.sweat",
              signature:
                "ed25519:5NuszWGgsVB5yPWqvGMGP3yCjs5YVh3QtWw79kch5mf3ApSVqpzTD42TzAsKcmhauDYDhzU8SUU9dGx2rHodJRLn",
              signerId:
                "2fe75000c84efd3b64f88f61d88cd08c339b8c6654e6239f7d4e3592aa92c659",
            },
          },
        ],
      },
      receiptExecutionOutcomes: [
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            outcome: {
              executorId: "app.nearcrowd.near",
              gasBurnt: 3300309921959,
              logs: [],
              metadata: {
                gasProfile: [
                  {
                    cost: "BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3177217332",
                  },
                  {
                    cost: "CONTRACT_LOADING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "35445963",
                  },
                  {
                    cost: "CONTRACT_LOADING_BYTES",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "104961404250",
                  },
                  {
                    cost: "READ_CACHED_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "86640000000",
                  },
                  {
                    cost: "READ_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "13049316000",
                  },
                  {
                    cost: "READ_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "315510639",
                  },
                  {
                    cost: "READ_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "7551495558",
                  },
                  {
                    cost: "READ_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "19712400",
                  },
                  {
                    cost: "STORAGE_READ_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "56356845750",
                  },
                  {
                    cost: "STORAGE_READ_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "154762665",
                  },
                  {
                    cost: "STORAGE_READ_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "123442110",
                  },
                  {
                    cost: "STORAGE_WRITE_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "128393472000",
                  },
                  {
                    cost: "STORAGE_WRITE_EVICTED_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "706580754",
                  },
                  {
                    cost: "STORAGE_WRITE_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1691588808",
                  },
                  {
                    cost: "STORAGE_WRITE_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1675001106",
                  },
                  {
                    cost: "TOUCHING_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "418650854076",
                  },
                  {
                    cost: "WASM_INSTRUCTION",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "24383196816",
                  },
                  {
                    cost: "WRITE_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "11215179444",
                  },
                  {
                    cost: "WRITE_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "588334752",
                  },
                  {
                    cost: "WRITE_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "11462089944",
                  },
                  {
                    cost: "WRITE_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "843947208",
                  },
                ],
                version: 1,
              },
              receiptIds: ["8kGPN9gvU8dhZy3374rTa3LjtxcZcHcZkXRAf56si2vh"],
              status: { SuccessValue: "" },
              tokensBurnt: "330030992195900000000",
            },
            proof: [
              {
                direction: "Right",
                hash: "8uFcqYe8azbspu5mofVCt5TC6K4n6kTbNBRwDt3CRT6Z",
              },
              {
                direction: "Left",
                hash: "9C9aaY5ECUzq1t2NtXQVXTH6wZ8sBExs33KhVNmjFnQJ",
              },
              {
                direction: "Right",
                hash: "8VRHTUKsUcZRDgrKizV5sup3Zvzg6reRacn3KmeUVY9n",
              },
            ],
          },
          receipt: {
            predecessorId: "app.nearcrowd.near",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJhY2NvdW50X2lkIjoicmV6ZXJ2LTI5Lm5lYXIiLCJzb2x1dGlvbl9oYXNoIjpbMTY2LDIwNCw2NSw3NCwxMTksMiwyOSwzMywyMTMsMTA1LDE2OCw0LDE5NCwxNzksMTk3LDUyLDI0MSw1NSwxLDEwMSwxNTcsNjQsMTI0LDAsMTE4LDY3LDE4NywxMjEsMTMzLDQxLDIzOSwyNDNdfQ==",
                      deposit: "0",
                      gas: 200000000000000,
                      methodName: "approve_solution",
                    },
                  },
                ],
                gasPrice: "335989893",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "app.nearcrowd.near",
                signerPublicKey:
                  "ed25519:CXYkSHvK2rj6sCGbaKPbTtwhcMrPvWxs1ntVvA6vLtm2",
              },
            },
            receiptId: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            receiverId: "app.nearcrowd.near",
          },
        },
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            outcome: {
              executorId: "app.nearcrowd.near",
              gasBurnt: 5360036359518,
              logs: [],
              metadata: {
                gasProfile: [
                  {
                    cost: "BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "15091782327",
                  },
                  {
                    cost: "CONTRACT_LOADING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "35445963",
                  },
                  {
                    cost: "CONTRACT_LOADING_BYTES",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "104961404250",
                  },
                  {
                    cost: "READ_CACHED_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "592800000000",
                  },
                  {
                    cost: "READ_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "62636716800",
                  },
                  {
                    cost: "READ_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2698946430",
                  },
                  {
                    cost: "READ_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "42791808162",
                  },
                  {
                    cost: "READ_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "125075178",
                  },
                  {
                    cost: "STORAGE_HAS_KEY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "54039896625",
                  },
                  {
                    cost: "STORAGE_HAS_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "738980280",
                  },
                  {
                    cost: "STORAGE_READ_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "281784228750",
                  },
                  {
                    cost: "STORAGE_READ_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "4859547681",
                  },
                  {
                    cost: "STORAGE_READ_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "4253141790",
                  },
                  {
                    cost: "STORAGE_REMOVE_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "160419091500",
                  },
                  {
                    cost: "STORAGE_REMOVE_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1605256128",
                  },
                  {
                    cost: "STORAGE_REMOVE_RET_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1141624044",
                  },
                  {
                    cost: "STORAGE_WRITE_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "449377152000",
                  },
                  {
                    cost: "STORAGE_WRITE_EVICTED_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "9121315188",
                  },
                  {
                    cost: "STORAGE_WRITE_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "6977803833",
                  },
                  {
                    cost: "STORAGE_WRITE_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "11880100437",
                  },
                  {
                    cost: "TOUCHING_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "933913443708",
                  },
                  {
                    cost: "WASM_INSTRUCTION",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "83208605304",
                  },
                  {
                    cost: "WRITE_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "50468307498",
                  },
                  {
                    cost: "WRITE_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3500047020",
                  },
                  {
                    cost: "WRITE_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "48713882262",
                  },
                  {
                    cost: "WRITE_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "4824184716",
                  },
                ],
                version: 1,
              },
              receiptIds: ["HF5rs8fq4n8HygFMYiQ8nWZSpVncKBnCXj9aNpvzZsAP"],
              status: { SuccessValue: "ZmFsc2U=" },
              tokensBurnt: "536003635951800000000",
            },
            proof: [
              {
                direction: "Left",
                hash: "2Lon5RSqBvnuGcXgkneYZTUUup6CotQYqEbi1eYfBfVK",
              },
              {
                direction: "Left",
                hash: "9C9aaY5ECUzq1t2NtXQVXTH6wZ8sBExs33KhVNmjFnQJ",
              },
              {
                direction: "Right",
                hash: "8VRHTUKsUcZRDgrKizV5sup3Zvzg6reRacn3KmeUVY9n",
              },
            ],
          },
          receipt: {
            predecessorId: "evaenergy.near",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJ0YXNrX29yZGluYWwiOjEsImJpZCI6IjQ0NDQ2ODcxMTE2MjIyODMzODczMDc2In0=",
                      deposit: "0",
                      gas: 30000000000000,
                      methodName: "claim_assignment",
                    },
                  },
                ],
                gasPrice: "122987387",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "evaenergy.near",
                signerPublicKey:
                  "ed25519:9Q53x5kiLChb4tX3J5dV2wNAdTetejEcnizyQ3n3PZdg",
              },
            },
            receiptId: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            receiverId: "app.nearcrowd.near",
          },
        },
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "5GMwBgfhgASLVXkCsqMn2riVbByJPh2pmyxCeQmbHHWe",
            outcome: {
              executorId: "app.nearcrowd.near",
              gasBurnt: 223182562500,
              logs: [],
              metadata: { gasProfile: [], version: 1 },
              receiptIds: [],
              status: { SuccessValue: "" },
              tokensBurnt: "0",
            },
            proof: [
              {
                direction: "Left",
                hash: "BcJG6WkrSgW8dsc8iBJHNZcP7576vvRQGBagZZfuXkmG",
              },
            ],
          },
          receipt: {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "67682508099918060916120" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "app.nearcrowd.near",
                signerPublicKey:
                  "ed25519:6MP4bCPHEud33eKXM9kg7f9fVNhmn97CNUyn5ZwM375U",
              },
            },
            receiptId: "5GMwBgfhgASLVXkCsqMn2riVbByJPh2pmyxCeQmbHHWe",
            receiverId: "app.nearcrowd.near",
          },
        },
      ],
      shardId: 0,
      stateChanges: [
        {
          cause: {
            txHash: "3GYUTXHUQMH1kpccEms6yNVzckyAedUTWKPQpEN4tc5K",
            type: "transaction_processing",
          },
          change: {
            accountId:
              "2fe75000c84efd3b64f88f61d88cd08c339b8c6654e6239f7d4e3592aa92c659",
            amount: "31778755366428489684978",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 182,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "3W8KnZUsb7Mb3SZk7yygL5F2L2C6djxZ3fVumodB2KQe",
            type: "transaction_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559406007009136306129113176",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976751,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559406007009136306129113176",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976842,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            type: "action_receipt_gas_reward",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559406033168998233329113176",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976842,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559406033168998233329113176",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976788,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "action_receipt_gas_reward",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559406121128031869529113176",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976788,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "5GMwBgfhgASLVXkCsqMn2riVbByJPh2pmyxCeQmbHHWe",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            amount: "6559473803636131787590029296",
            codeHash: "DyHG2t99dBZWiPgX53Z4UbbBQR6JJoxmqXwaKD4hTeyP",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 3976788,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "3GYUTXHUQMH1kpccEms6yNVzckyAedUTWKPQpEN4tc5K",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 70681752000024, permission: "FullAccess" },
            accountId:
              "2fe75000c84efd3b64f88f61d88cd08c339b8c6654e6239f7d4e3592aa92c659",
            publicKey: "ed25519:4Dzjg5EJX1RBYctnzmi1SNoq6fswSowsiWB5m3sEcC4Q",
          },
          type: "access_key_update",
        },
        {
          cause: {
            txHash: "3W8KnZUsb7Mb3SZk7yygL5F2L2C6djxZ3fVumodB2KQe",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 43616777771952, permission: "FullAccess" },
            accountId: "app.nearcrowd.near",
            publicKey: "ed25519:CXYkSHvK2rj6sCGbaKPbTtwhcMrPvWxs1ntVvA6vLtm2",
          },
          type: "access_key_update",
        },
        {
          cause: {
            receiptHash: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "U1RBVEU=",
            valueBase64: "EgAAAGFwcC5uZWFyY3Jvd2QubmVhcg==",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "8FWEuJ76SphAbWL2hgsJ36zD5jobWjqPNE2xQWaEFKNY",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "YQ4AAAByZXplcnYtMjkubmVhcg==",
            valueBase64: "psxBSncCHSHVaagEwrPFNPE3AWWdQHwAdkO7eYUp7/M=",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "cAEAAAA=",
            valueBase64:
              "AABAe6XwY4GWCgAAAAAAAAAA9ESCkWNFAAAAAAAAAAAsAQAAAAAAABACoJtTF3zmCgkAAAAAAADcEUiC7mdEF6E7rAAAAAAABgAAAHQBAAAAYrtzrAAAAAAABgAAAHQBAAAAYh0EAAAAAAAABgAAAHQBAAAAYwYAAAB0AQAAAGUGAAAAdAEAAABmBgAAAHQBAAAAZwEGAAAAdAEAAABtAA==",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "dAEAAABjHQQAAAAAAAA=",
          },
          type: "data_deletion",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "dAEAAABjIgEAAAAAAAA=",
            valueBase64: "epIvaamXn1S0leE2SA8w+TxNWM4rEC75i6V3XS7gjvAE",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "dAEAAABjmwAAAAAAAAA=",
            valueBase64: "0h0vJmTB/V9IK0xVxNBid+JAmsnySRFNF3jnQNl2m8sB",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "dAEAAABjqQEAAAAAAAA=",
            valueBase64: "s+OZU4d49W6Qv/gFmkBPsmVUX1WVbDiJAJzJse0tXVEE",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            type: "receipt_processing",
          },
          change: {
            accountId: "app.nearcrowd.near",
            keyBase64: "dAEAAABnDgAAAGV2YWVuZXJneS5uZWFy",
            valueBase64:
              "A/UhKZel+/gCMLF4XhBcxERDBIa48p9qlYBMRIbWALUgA+XURCXiZ0QXWujnX0t/H7y0BAAAAAAAAA==",
          },
          type: "data_update",
        },
      ],
    },
    {
      chunk: {
        author: "bisontrails.poolv1.near",
        header: {
          balanceBurnt: "1433581134734200000000",
          chunkHash: "BqfFW2NyLJuyp1pGgXd2ffYPGptNswNVH6ZJuTq5zSNa",
          encodedLength: 161,
          encodedMerkleRoot: "EB5tG2a3aVfXv41ESuQVT1ZvQFvuwKnkYGLc2CDVCf5w",
          gasLimit: 1000000000000000,
          gasUsed: 19438956235189,
          heightCreated: 85376002,
          heightIncluded: 85376002,
          outcomeRoot: "Cp7GeqLAqZ1Z1GbtCL5nG13wxy6mV6PaRdwLddDHjhVc",
          outgoingReceiptsRoot: "DP1DT6QP1tNHM5ZjHMJ3C8G2mHJd8kGoFFNEdZPN8Hyx",
          prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
          prevStateRoot: "73sn3JyP1LU58r1FsTo5ZVgvErdbEGFxtiGExkWwhQUd",
          rentPaid: "0",
          shardId: 1,
          signature:
            "ed25519:3RYj6fpboT1ALHsVxYtYmofT8fGf1VRhNaJhWY45hsKdePcX3AZb3rdKBAZMThF5PVn5j5boKWHPb9zd1xZWYzex",
          txRoot: "11111111111111111111111111111111",
          validatorProposals: [],
          validatorReward: "0",
        },
        receipts: [
          {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [
                  { Transfer: { deposit: "187086049935277727891452" } },
                ],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "relay.aurora",
                signerPublicKey:
                  "ed25519:8j2e8u9t1SoTgMPn5G65ChU5WskpcnemBjwzkAnxDtZq",
              },
            },
            receiptId: "CdUSBwV29D1P1qvxCwnbfNsTsdxfdRY6PxezsSWRFyqN",
            receiverId: "relay.aurora",
          },
        ],
        transactions: [],
      },
      receiptExecutionOutcomes: [
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "821S5L8Htxafh2DDuDKtA4qapudN3mRq2AMv2qPeBhpj",
            outcome: {
              executorId: "aurora",
              gasBurnt: 3497076222351,
              logs: [
                "signer_address Address(0x605ce19532c7121d1b5e632eb776e5aa7bfb8990)",
              ],
              metadata: {
                gasProfile: [
                  {
                    cost: "BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "5295362220",
                  },
                  {
                    cost: "CONTRACT_LOADING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "35445963",
                  },
                  {
                    cost: "CONTRACT_LOADING_BYTES",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "207231423750",
                  },
                  {
                    cost: "ECRECOVER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "278821988457",
                  },
                  {
                    cost: "KECCAK256_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "17638473825",
                  },
                  {
                    cost: "KECCAK256_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "8889037470",
                  },
                  {
                    cost: "LOG_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3543313050",
                  },
                  {
                    cost: "LOG_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "871120206",
                  },
                  {
                    cost: "READ_CACHED_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "9120000000",
                  },
                  {
                    cost: "READ_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "20878905600",
                  },
                  {
                    cost: "READ_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2128746480",
                  },
                  {
                    cost: "READ_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "22654486674",
                  },
                  {
                    cost: "READ_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "65642292",
                  },
                  {
                    cost: "STORAGE_READ_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "112713691500",
                  },
                  {
                    cost: "STORAGE_READ_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "897623457",
                  },
                  {
                    cost: "STORAGE_READ_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "482546430",
                  },
                  {
                    cost: "TOUCHING_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "209325427038",
                  },
                  {
                    cost: "UTF8_DECODING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "6223558122",
                  },
                  {
                    cost: "UTF8_DECODING_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "24784340715",
                  },
                  {
                    cost: "WASM_INSTRUCTION",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "84250214400",
                  },
                  {
                    cost: "WRITE_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "22430358888",
                  },
                  {
                    cost: "WRITE_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1639710744",
                  },
                  {
                    cost: "WRITE_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "25789702374",
                  },
                  {
                    cost: "WRITE_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2531841624",
                  },
                ],
                version: 1,
              },
              receiptIds: ["H4FHCm5scAbLHhki995o2UoJsHYuJHfbbCx5egAjNmk9"],
              status: {
                Failure: {
                  ActionError: {
                    index: 0,
                    kind: {
                      FunctionCallError: {
                        ExecutionError:
                          "Smart contract panicked: ERR_INCORRECT_NONCE",
                      },
                    },
                  },
                },
              },
              tokensBurnt: "349707622235100000000",
            },
            proof: [],
          },
          receipt: {
            predecessorId: "relay.aurora",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "+QGPggpehAQsHYCCUgiU5ShUyG+2SwTdHXetVCh23cBAxPSAuQEkGMuv5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGiUDx20tY/zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAR/fZpFXwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAGBc4ZUyxxIdG15jLrd25ap7+4mQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhaeq/ToAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAADCXWsrHC113TW91as0DqbkM1NT1AAAAAAAAAAAAAAAASYiolrEichjkpob95eq9yr2RVx8AAAAAAAAAAAAAAADJve7TPNAVQeHu0Q+QUZ0sBv4/64ScioLIoNNwZYHzq18jJVWwzwd9vJY1JV4H29H/wOgwyQVM2FJzoCUAB6Nz+98pSh9AfalXBMbThpftEUVyF49fYhEKwmJf",
                      deposit: "0",
                      gas: 300000000000000,
                      methodName: "submit",
                    },
                  },
                ],
                gasPrice: "625040174",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "relay.aurora",
                signerPublicKey:
                  "ed25519:2WmTnJeWZYKhh6NC3z3xTDKU5sHHAmHF96V6KAB3eHK5",
              },
            },
            receiptId: "821S5L8Htxafh2DDuDKtA4qapudN3mRq2AMv2qPeBhpj",
            receiverId: "aurora",
          },
        },
      ],
      shardId: 1,
      stateChanges: [
        {
          cause: {
            receiptHash: "821S5L8Htxafh2DDuDKtA4qapudN3mRq2AMv2qPeBhpj",
            type: "action_receipt_gas_reward",
          },
          change: {
            accountId: "aurora",
            amount: "62420509105129651830808079298",
            codeHash: "qorYWFPQKMbJGcmjtWUhD3ee7fJJakRRUYFk3cao4W3",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 6176907778,
          },
          type: "account_update",
        },
      ],
    },
    {
      chunk: {
        author: "republic.poolv1.near",
        header: {
          balanceBurnt: "242806857164400000000",
          chunkHash: "6uDUqFuYwGohFMQ9UyRaHbmHALf8HS9F6WcNnZWypkka",
          encodedLength: 1474,
          encodedMerkleRoot: "9rtC25N5jqfLxMumUwvupL9MpMNUAEKuXZB8RmfkdD7p",
          gasLimit: 1000000000000000,
          gasUsed: 2428068571644,
          heightCreated: 85376002,
          heightIncluded: 85376002,
          outcomeRoot: "AvRw1DBT1JFB2KNuahMvYucvttrem74GSEnwMacxbkv6",
          outgoingReceiptsRoot: "C2QjTGsH8HcfR6W7ecLYwuYD3Vkw6mi9Pf9tFXuGdMLr",
          prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
          prevStateRoot: "CtxzDGCGs1SAr7GEqrA8gSKCcbaPDMKegnTyPEJmU7mb",
          rentPaid: "0",
          shardId: 2,
          signature:
            "ed25519:66LFkWB13BEUYRsmockx9LbiBzko9zohGkfbLwJertYWAa5TJY5ELFxPycps6poroh1C7Tfbh6NH7tQpgHZFr43d",
          txRoot: "DVr9U4uYvJY1cz5awdSmKm4CovJmr1VcPyqCMonat8bD",
          validatorProposals: [],
          validatorReward: "0",
        },
        receipts: [
          {
            predecessorId: "evaenergy.near",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJ0YXNrX29yZGluYWwiOjEsImJpZCI6IjQ0NDQ2ODcxMTE2MjIyODMzODczMDc2In0=",
                      deposit: "0",
                      gas: 30000000000000,
                      methodName: "claim_assignment",
                    },
                  },
                ],
                gasPrice: "122987387",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "evaenergy.near",
                signerPublicKey:
                  "ed25519:9Q53x5kiLChb4tX3J5dV2wNAdTetejEcnizyQ3n3PZdg",
              },
            },
            receiptId: "6XN47idjeWhq2QpkjGs9w7pPg452Z1GwgwRxZjy2ny7T",
            receiverId: "app.nearcrowd.near",
          },
        ],
        transactions: [
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "F4z3CFPjUGRJEF9rNSVhz4hZG2LpBvA3rR3AHv68432i",
                outcome: {
                  executorId: "chadmoney.near",
                  gasBurnt: 2428372658668,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["Ht6wAxzHfyCwWmfkngi9n6DaJu6UtoD1skHpJrRJQGik"],
                  status: {
                    SuccessReceiptId:
                      "Ht6wAxzHfyCwWmfkngi9n6DaJu6UtoD1skHpJrRJQGik",
                  },
                  tokensBurnt: "242837265866800000000",
                },
                proof: [
                  {
                    direction: "Right",
                    hash: "E4X99JiTuYjYW6WPMiBhZ61Eo9fDYXmDdv67ZdkSbcf3",
                  },
                  {
                    direction: "Right",
                    hash: "2NXhS3PRa1H8UZEtrNo14QhYNTzk5ztBhrSe6rb64heg",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "eyJhY3Rpb25zIjpbeyJwb29sX2lkIjo0LCJ0b2tlbl9pbiI6IndyYXAubmVhciIsInRva2VuX291dCI6ImRhYzE3Zjk1OGQyZWU1MjNhMjIwNjIwNjk5NDU5N2MxM2Q4MzFlYzcuZmFjdG9yeS5icmlkZ2UubmVhciIsImFtb3VudF9pbiI6IjEwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJtaW5fYW1vdW50X291dCI6IjI0NzE5ODgxNjIifV19",
                    deposit: "1",
                    gas: 10000000000000,
                    methodName: "swap",
                  },
                },
              ],
              hash: "F4z3CFPjUGRJEF9rNSVhz4hZG2LpBvA3rR3AHv68432i",
              nonce: 72650480016948,
              publicKey: "ed25519:78fzZoSWw4yr7gRev6onwRFQPu5auDAPNuAhM2Ryy4EC",
              receiverId: "v2.ref-finance.near",
              signature:
                "ed25519:SYNT4UNqfEpAofZykZpZUugyPxXpSxYPwo8BqVg1fPG8BZvQKJgmHkoLsEbG2bsTfW1iGr886E6mw4nRDLJQ9e1",
              signerId: "chadmoney.near",
            },
          },
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "3Zgj4eFNymhW7LBsaKtUsCWAaoP9LBXKGFtmebYsfibU",
                outcome: {
                  executorId:
                    "fd305d28fa12cb2e2769b211248059b8f4033ef4d4c0072c7daf246b166106ba",
                  gasBurnt: 2428312288450,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["ENQk2JGnPNtpXPUFkpBhnD3XUyv67eXB4XfmDU2sjHB7"],
                  status: {
                    SuccessReceiptId:
                      "ENQk2JGnPNtpXPUFkpBhnD3XUyv67eXB4XfmDU2sjHB7",
                  },
                  tokensBurnt: "242831228845000000000",
                },
                proof: [
                  {
                    direction: "Left",
                    hash: "GAdP76ExKf5yQH9BU5usAeAWxiX2HkmDP7g54Ff47Zgz",
                  },
                  {
                    direction: "Right",
                    hash: "2NXhS3PRa1H8UZEtrNo14QhYNTzk5ztBhrSe6rb64heg",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "eyJyZWNlaXZlcl9pZCI6InJld2FyZC1vcHRpbi5zd2VhdCIsImFtb3VudCI6IjEwMDAwMDAwMDAwMDAwMDAwMCIsIm1lbW8iOiJzdzpyZXc6b3B0aW46WUdSV3ZncFhLMC1mZDMwNWQyOGZhMTJjYjJlMjc2OWIyMTEyNDgwNTliOGY0MDMzZWY0ZDRjMDA3MmM3ZGFmMjQ2YjE2NjEwNmJhIn0=",
                    deposit: "1",
                    gas: 14000000000000,
                    methodName: "ft_transfer",
                  },
                },
              ],
              hash: "3Zgj4eFNymhW7LBsaKtUsCWAaoP9LBXKGFtmebYsfibU",
              nonce: 64674524000017,
              publicKey: "ed25519:J3LvQdaf6r6YVuTrVzo6em32R2ZG7jE9n4ysiLUpMa4y",
              receiverId: "token.sweat",
              signature:
                "ed25519:3gdWeCTcqbT3ezViXEPaRiRafz4NcRRsP7bAwgY1CTFenKcFQB5gyvQqSHPAtQbx7JdppByH4j6SrEMxmPedFyPY",
              signerId:
                "fd305d28fa12cb2e2769b211248059b8f4033ef4d4c0072c7daf246b166106ba",
            },
          },
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "DbCXaFDNfQ7LjM5Jh8BS5fKLF6UJG3vJZYbGtfpDaTEB",
                outcome: {
                  executorId:
                    "de9d1abf39de5fc4eac513b559cc825352d03c7b642a8af657113d61f8c195dc",
                  gasBurnt: 2428158009004,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["86Xs7Z6wiQNb89hV5j33UHbBZTXrbBYtqwBMBT3Hhq4h"],
                  status: {
                    SuccessReceiptId:
                      "86Xs7Z6wiQNb89hV5j33UHbBZTXrbBYtqwBMBT3Hhq4h",
                  },
                  tokensBurnt: "242815800900400000000",
                },
                proof: [
                  {
                    direction: "Right",
                    hash: "AJhsQtiU5riKpBKSBbHYD9svR84eZ3oYqd8eRjipqTFZ",
                  },
                  {
                    direction: "Left",
                    hash: "45QTFnLgDmAbiiVBFmVHnivqQFU2ATNgLNErLnvZYZq2",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "eyJyZWNlaXZlcl9pZCI6ImRlcG9zaXRzLmdyb3cuc3dlYXQiLCJhbW91bnQiOiIxMDIxOTAwMDAwMDAwMDAwMDAwMDAiLCJtZW1vIjoic3c6ZDpnV095RFk0TEVrIn0=",
                    deposit: "1",
                    gas: 14000000000000,
                    methodName: "ft_transfer",
                  },
                },
              ],
              hash: "DbCXaFDNfQ7LjM5Jh8BS5fKLF6UJG3vJZYbGtfpDaTEB",
              nonce: 64963031000010,
              publicKey: "ed25519:FyzTGZb9mP8gcDbyhLCLumsA38a1JF3E5WELLJHnJsab",
              receiverId: "token.sweat",
              signature:
                "ed25519:25q5o12NchK9rnUmrddTFKzYYCdqmPfQWq1QgRhGJiDiZmazqS2B4mPu7PeGYvVAEqucgq2k41EmXwgN3vLExjW5",
              signerId:
                "de9d1abf39de5fc4eac513b559cc825352d03c7b642a8af657113d61f8c195dc",
            },
          },
        ],
      },
      receiptExecutionOutcomes: [
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "CEgnqr5aYdpBErSzjvdtmdqnXdmXjXqe1AnPeamsLcvM",
            outcome: {
              executorId:
                "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
              gasBurnt: 424555062500,
              logs: [],
              metadata: { gasProfile: [], version: 1 },
              receiptIds: [],
              status: { SuccessValue: "" },
              tokensBurnt: "0",
            },
            proof: [
              {
                direction: "Left",
                hash: "DiN9q4rgCEpmykqXzoXWP2dNdjLyWEAgYzi7UmsQhEpx",
              },
              {
                direction: "Left",
                hash: "45QTFnLgDmAbiiVBFmVHnivqQFU2ATNgLNErLnvZYZq2",
              },
            ],
          },
          receipt: {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "1389731257024010315000" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId:
                  "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
                signerPublicKey:
                  "ed25519:HWHJq9M3m232SGpRTXuycdvjPEaaxn9TFN72bnEXnESp",
              },
            },
            receiptId: "CEgnqr5aYdpBErSzjvdtmdqnXdmXjXqe1AnPeamsLcvM",
            receiverId:
              "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
          },
        },
      ],
      shardId: 2,
      stateChanges: [
        {
          cause: {
            txHash: "F4z3CFPjUGRJEF9rNSVhz4hZG2LpBvA3rR3AHv68432i",
            type: "transaction_processing",
          },
          change: {
            accountId: "chadmoney.near",
            amount: "3455422147665387737062056",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 2282,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "DbCXaFDNfQ7LjM5Jh8BS5fKLF6UJG3vJZYbGtfpDaTEB",
            type: "transaction_processing",
          },
          change: {
            accountId:
              "de9d1abf39de5fc4eac513b559cc825352d03c7b642a8af657113d61f8c195dc",
            amount: "37838802127313908609194",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 182,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "CEgnqr5aYdpBErSzjvdtmdqnXdmXjXqe1AnPeamsLcvM",
            type: "receipt_processing",
          },
          change: {
            accountId:
              "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
            amount: "44000142104620699999996",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 182,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "3Zgj4eFNymhW7LBsaKtUsCWAaoP9LBXKGFtmebYsfibU",
            type: "transaction_processing",
          },
          change: {
            accountId:
              "fd305d28fa12cb2e2769b211248059b8f4033ef4d4c0072c7daf246b166106ba",
            amount: "33618268317256489684987",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 182,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "F4z3CFPjUGRJEF9rNSVhz4hZG2LpBvA3rR3AHv68432i",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 72650480016948, permission: "FullAccess" },
            accountId: "chadmoney.near",
            publicKey: "ed25519:78fzZoSWw4yr7gRev6onwRFQPu5auDAPNuAhM2Ryy4EC",
          },
          type: "access_key_update",
        },
        {
          cause: {
            txHash: "DbCXaFDNfQ7LjM5Jh8BS5fKLF6UJG3vJZYbGtfpDaTEB",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 64963031000010, permission: "FullAccess" },
            accountId:
              "de9d1abf39de5fc4eac513b559cc825352d03c7b642a8af657113d61f8c195dc",
            publicKey: "ed25519:FyzTGZb9mP8gcDbyhLCLumsA38a1JF3E5WELLJHnJsab",
          },
          type: "access_key_update",
        },
        {
          cause: {
            txHash: "3Zgj4eFNymhW7LBsaKtUsCWAaoP9LBXKGFtmebYsfibU",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 64674524000017, permission: "FullAccess" },
            accountId:
              "fd305d28fa12cb2e2769b211248059b8f4033ef4d4c0072c7daf246b166106ba",
            publicKey: "ed25519:J3LvQdaf6r6YVuTrVzo6em32R2ZG7jE9n4ysiLUpMa4y",
          },
          type: "access_key_update",
        },
      ],
    },
    {
      chunk: {
        author: "binancenode1.poolv1.near",
        header: {
          balanceBurnt: "599537042985400000000",
          chunkHash: "3Q39LzrowGBhqRZvkjDqQNjkfUEYEK6Zis5LUzqvrtFj",
          encodedLength: 1837,
          encodedMerkleRoot: "2d1EBsn1UspGLYjyFkrzPoawjghZe4fBbWkZfmsPJRbM",
          gasLimit: 1000000000000000,
          gasUsed: 7599093905353,
          heightCreated: 85376002,
          heightIncluded: 85376002,
          outcomeRoot: "CUmJsZfPtNYEggezXf6wW7NX2i7Vn9yuPz7RWfVKxR7p",
          outgoingReceiptsRoot: "8TG5j9ahcEtGUNREhCEJW3SgHyeCzochf4foYxSU7b8Q",
          prevBlockHash: "H5X25nVZgx43tQSMcF5bRLphWGN92UVYdvaAhcgW4no7",
          prevStateRoot: "EPbgnc5qJFvFGqqAyQQu2SrFcVr6mr3AVbSuXnHvZ1ie",
          rentPaid: "0",
          shardId: 3,
          signature:
            "ed25519:RgPmNaXij3pNFdMVi1Ex8WXyQiYr12uUyRk5tuoddJvCTwJXcxQZZLCdy1XqB6uB9imMz9NsXQwT1M993NBMsjS",
          txRoot: "8V1iVH9TSzWsPtNVorScHc4ha9ESNqNEG13tZiRSDzk7",
          validatorProposals: [],
          validatorReward: "0",
        },
        receipts: [
          {
            predecessorId: "relay.aurora",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "+QGPggpehAQsHYCCUgiU5ShUyG+2SwTdHXetVCh23cBAxPSAuQEkGMuv5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGiUDx20tY/zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAR/fZpFXwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAGBc4ZUyxxIdG15jLrd25ap7+4mQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhaeq/ToAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAADCXWsrHC113TW91as0DqbkM1NT1AAAAAAAAAAAAAAAASYiolrEichjkpob95eq9yr2RVx8AAAAAAAAAAAAAAADJve7TPNAVQeHu0Q+QUZ0sBv4/64ScioLIoNNwZYHzq18jJVWwzwd9vJY1JV4H29H/wOgwyQVM2FJzoCUAB6Nz+98pSh9AfalXBMbThpftEUVyF49fYhEKwmJf",
                      deposit: "0",
                      gas: 300000000000000,
                      methodName: "submit",
                    },
                  },
                ],
                gasPrice: "625040174",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "relay.aurora",
                signerPublicKey:
                  "ed25519:2WmTnJeWZYKhh6NC3z3xTDKU5sHHAmHF96V6KAB3eHK5",
              },
            },
            receiptId: "821S5L8Htxafh2DDuDKtA4qapudN3mRq2AMv2qPeBhpj",
            receiverId: "aurora",
          },
          {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "1389731257024010315000" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId:
                  "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
                signerPublicKey:
                  "ed25519:HWHJq9M3m232SGpRTXuycdvjPEaaxn9TFN72bnEXnESp",
              },
            },
            receiptId: "CEgnqr5aYdpBErSzjvdtmdqnXdmXjXqe1AnPeamsLcvM",
            receiverId:
              "f53b45ec59e26a50160026bd4e3d232a6672e0ee812d46cfcd29c0ef44a089f5",
          },
        ],
        transactions: [
          {
            outcome: {
              executionOutcome: {
                blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
                id: "AMdmdjfHvKX6vv1fNEyCCio2jmSvepxSetxQFhgj826f",
                outcome: {
                  executorId: "relay.aurora",
                  gasBurnt: 2429696331596,
                  logs: [],
                  metadata: { gasProfile: null, version: 1 },
                  receiptIds: ["9p28ts6sz8Meg4vu3Fqff5QmfkwFc65C22WgAoKF1ELh"],
                  status: {
                    SuccessReceiptId:
                      "9p28ts6sz8Meg4vu3Fqff5QmfkwFc65C22WgAoKF1ELh",
                  },
                  tokensBurnt: "242969633159600000000",
                },
                proof: [
                  {
                    direction: "Right",
                    hash: "CKbaXt3vrGUUt7Ydw1gjb9by6pbtMooXo7uWJrbWAXXX",
                  },
                  {
                    direction: "Right",
                    hash: "4NXWzpp8uSWuhoAXgsJKCs2eyAVHL3wXxsAWocx1Fs5K",
                  },
                  {
                    direction: "Right",
                    hash: "FmBQ954izf84EZ5P4GVvmUfc8T4bGXXqQruyDTtikwo1",
                  },
                ],
              },
              receipt: null,
            },
            transaction: {
              actions: [
                {
                  FunctionCall: {
                    args: "+QMRgw65o4QELB2Agww1AJSQVQb22oFec8oTVHtF0ZmIZxBLIoC5AqS/zVdxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApRioAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQDIwNjdlMDg4OWUyYmJmM2ZjYTI3NmFjOWNiYzdiYjI5OThmNzQzMjM1ZjUwNjU4NDUwNjMyMzQxMDJhMGEzODYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwGI2NmMxNTdiYTljMWM0YTAxOWEzOTQ4MjlkMzQyMGQ4YjIxZDg5OTQzZjMzYTdiYTExMDQ0MWFiNDExOGI4NTYzZWNiZTkxM2Q5YTJmZmNhNTNiNGU1NWJjNTFiZDdmNjEyZDQxZDkxNTY4M2MzNGNiZWVhYTg0Yzc0NWI2N2VmNjZlMTM2YjE2NTFkZTEwODk3OWM0YjE4NzFiMjIwMjIyYmI4ZTBkNTgwNmM0ZjFlZjliY2U1OWRlNzI1Y2Y0YwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAYTE5ZWJlNmFmZjRiM2MxZGIxZjY2Njc5Nzc1MDc1ZTZkMzY0NGFlYjBiZmYyZmQxMjQzNjg5ZTQ3ZmNjYTk5NzA4NzhlY2E5MzI4ZDQ5YmM1ZGZiYWI0ZDU4N2Y4OGQ5MTkyMTJiY2FjYzY0YzJhNGFmMDUxZmFkZWE4NjdhZDkwMDUzMzY4OWQ1ZDcwNzg5YTQyMjNmMzVkM2JhYzhlNzE0NzY2NDg5NjQ4ODAxMTk1NGRlMDRiZWM0NDM3N2U4hJyKgsegSqdU7My5fwrLI1Mc3JcSJSgvQcmZsI1Chymt8Ydj0gqgXGqO8uaGvpV0jbfOyplT73XLhyC4ON9ekQI+tWB+8go=",
                    deposit: "0",
                    gas: 300000000000000,
                    methodName: "submit",
                  },
                },
              ],
              hash: "AMdmdjfHvKX6vv1fNEyCCio2jmSvepxSetxQFhgj826f",
              nonce: 65788368017229,
              publicKey: "ed25519:FptiMvPBN7QRJwroc2zJtTEAEo4h9CJAdGKQfd2bA3Qm",
              receiverId: "aurora",
              signature:
                "ed25519:LehYX21sAyodn5g7MxXPkztx9tQMHQ92gMg2KQYQV4pBKyGidLHz6y2aeLREUFt2ckxrdWNZ6VannAGBsPpiHPu",
              signerId: "relay.aurora",
            },
          },
        ],
      },
      receiptExecutionOutcomes: [
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "CdUSBwV29D1P1qvxCwnbfNsTsdxfdRY6PxezsSWRFyqN",
            outcome: {
              executorId: "relay.aurora",
              gasBurnt: 223182562500,
              logs: [],
              metadata: { gasProfile: [], version: 1 },
              receiptIds: [],
              status: { SuccessValue: "" },
              tokensBurnt: "0",
            },
            proof: [
              {
                direction: "Left",
                hash: "3zQuvAtY9UVHq2ws8vvMLmPivCpBPWwDhmTtCHNy1roV",
              },
              {
                direction: "Right",
                hash: "4NXWzpp8uSWuhoAXgsJKCs2eyAVHL3wXxsAWocx1Fs5K",
              },
              {
                direction: "Right",
                hash: "FmBQ954izf84EZ5P4GVvmUfc8T4bGXXqQruyDTtikwo1",
              },
            ],
          },
          receipt: {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [
                  { Transfer: { deposit: "187086049935277727891452" } },
                ],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "relay.aurora",
                signerPublicKey:
                  "ed25519:8j2e8u9t1SoTgMPn5G65ChU5WskpcnemBjwzkAnxDtZq",
              },
            },
            receiptId: "CdUSBwV29D1P1qvxCwnbfNsTsdxfdRY6PxezsSWRFyqN",
            receiverId: "relay.aurora",
          },
        },
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            outcome: {
              executorId: "token.sweat",
              gasBurnt: 4072736369755,
              logs: [
                'EVENT_JSON:{"standard":"nep141","version":"1.0.0","event":"ft_transfer","data":[{"old_owner_id":"7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab","new_owner_id":"reward-optin.sweat","amount":"100000000000000000","memo":"sw:rew:optin:YGRWvgpXK0-7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab"}]}',
              ],
              metadata: {
                gasProfile: [
                  {
                    cost: "BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "7413507108",
                  },
                  {
                    cost: "CONTRACT_LOADING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "35445963",
                  },
                  {
                    cost: "CONTRACT_LOADING_BYTES",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "44831486250",
                  },
                  {
                    cost: "LOG_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3543313050",
                  },
                  {
                    cost: "LOG_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "4342402239",
                  },
                  {
                    cost: "READ_CACHED_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "280440000000",
                  },
                  {
                    cost: "READ_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "36538084800",
                  },
                  {
                    cost: "READ_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2816787753",
                  },
                  {
                    cost: "READ_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "27688817046",
                  },
                  {
                    cost: "READ_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "48295380",
                  },
                  {
                    cost: "SHA256_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "18163881000",
                  },
                  {
                    cost: "SHA256_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3955245564",
                  },
                  {
                    cost: "STORAGE_READ_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "169070537250",
                  },
                  {
                    cost: "STORAGE_READ_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2259534909",
                  },
                  {
                    cost: "STORAGE_READ_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "572322510",
                  },
                  {
                    cost: "STORAGE_WRITE_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "192590208000",
                  },
                  {
                    cost: "STORAGE_WRITE_EVICTED_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3275965314",
                  },
                  {
                    cost: "STORAGE_WRITE_KEY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "5145249291",
                  },
                  {
                    cost: "STORAGE_WRITE_VALUE_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3163890978",
                  },
                  {
                    cost: "TOUCHING_TRIE_NODE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "611874325188",
                  },
                  {
                    cost: "UTF8_DECODING_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "3111779061",
                  },
                  {
                    cost: "UTF8_DECODING_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "95929977591",
                  },
                  {
                    cost: "WASM_INSTRUCTION",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "56074112424",
                  },
                  {
                    cost: "WRITE_MEMORY_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "33645538332",
                  },
                  {
                    cost: "WRITE_MEMORY_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "1378228632",
                  },
                  {
                    cost: "WRITE_REGISTER_BASE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "34386269832",
                  },
                  {
                    cost: "WRITE_REGISTER_BYTE",
                    costCategory: "WASM_HOST_COST",
                    gasUsed: "2128875840",
                  },
                ],
                version: 1,
              },
              receiptIds: ["BXhqz9Hk5eVb5ibaN3uZmNW4cgW6zBerUYpM7Zh19kXe"],
              status: { SuccessValue: "" },
              tokensBurnt: "407273636975500000000",
            },
            proof: [
              {
                direction: "Right",
                hash: "Cbwr9BAamScEJV1aMoZ21CULLdjPTpY6QQmfZNAS8cUx",
              },
              {
                direction: "Left",
                hash: "7x71otoV7zEDfh2v1hYcLD9GNFZkoza1d3uoJUc79GMV",
              },
              {
                direction: "Right",
                hash: "FmBQ954izf84EZ5P4GVvmUfc8T4bGXXqQruyDTtikwo1",
              },
            ],
          },
          receipt: {
            predecessorId:
              "7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab",
            receipt: {
              Action: {
                actions: [
                  {
                    FunctionCall: {
                      args: "eyJyZWNlaXZlcl9pZCI6InJld2FyZC1vcHRpbi5zd2VhdCIsImFtb3VudCI6IjEwMDAwMDAwMDAwMDAwMDAwMCIsIm1lbW8iOiJzdzpyZXc6b3B0aW46WUdSV3ZncFhLMC03YThiYTFiZDgwNDg2Mzg4M2FjZTEwZWQ3NjQ0MWU2YWQyMjM5YWU3OTE3Yjc4Yzg5NzAwYjcwMWY3NWNlMWFiIn0=",
                      deposit: "1",
                      gas: 14000000000000,
                      methodName: "ft_transfer",
                    },
                  },
                ],
                gasPrice: "109272700",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId:
                  "7a8ba1bd804863883ace10ed76441e6ad2239ae7917b78c89700b701f75ce1ab",
                signerPublicKey:
                  "ed25519:9FNEMP92rkuvRVefVkBW38RmbZ648XvQGeWbFYtdC7hk",
              },
            },
            receiptId: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            receiverId: "token.sweat",
          },
        },
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "BpZGWvbmx8sAMRsrhWyBnC5QHA9mFwist7orTceJTRvu",
            outcome: {
              executorId: "olezha4.near",
              gasBurnt: 223182562500,
              logs: [],
              metadata: { gasProfile: [], version: 1 },
              receiptIds: [],
              status: { SuccessValue: "" },
              tokensBurnt: "0",
            },
            proof: [
              {
                direction: "Left",
                hash: "GdEbJpKZ4iqem9VmS5Qbm2CTrt1qFZhfSD6zUv5JaYXT",
              },
              {
                direction: "Left",
                hash: "7x71otoV7zEDfh2v1hYcLD9GNFZkoza1d3uoJUc79GMV",
              },
              {
                direction: "Right",
                hash: "FmBQ954izf84EZ5P4GVvmUfc8T4bGXXqQruyDTtikwo1",
              },
            ],
          },
          receipt: {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "13222602662027447938448" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "olezha4.near",
                signerPublicKey:
                  "ed25519:EnLNUDncRuw4AYLcGmi1Hr2YQ1DLu12VutsubZ6k8c2F",
              },
            },
            receiptId: "BpZGWvbmx8sAMRsrhWyBnC5QHA9mFwist7orTceJTRvu",
            receiverId: "olezha4.near",
          },
        },
        {
          executionOutcome: {
            blockHash: "A5Jb7zz4VPuQhBFo7rXn8UoAPUSokjpiV9deSoEz5ijM",
            id: "3R2wjnktLwBKaceGiPetmShVAyHT2LuoQZMdNg6oWMwK",
            outcome: {
              executorId: "marthacecilia.near",
              gasBurnt: 223182562500,
              logs: [],
              metadata: { gasProfile: [], version: 1 },
              receiptIds: [],
              status: { SuccessValue: "" },
              tokensBurnt: "0",
            },
            proof: [
              {
                direction: "Left",
                hash: "6FWhYXFGBgzSPDuBCFrfSkdAqSvsMHPbnCJ2Q3UsmUV6",
              },
            ],
          },
          receipt: {
            predecessorId: "system",
            receipt: {
              Action: {
                actions: [{ Transfer: { deposit: "13239855304236542651168" } }],
                gasPrice: "0",
                inputDataIds: [],
                outputDataReceivers: [],
                signerId: "marthacecilia.near",
                signerPublicKey:
                  "ed25519:8W28RYFfXztNA7ENP4VTaitsqEjSbABQJDqELwbwXswq",
              },
            },
            receiptId: "3R2wjnktLwBKaceGiPetmShVAyHT2LuoQZMdNg6oWMwK",
            receiverId: "marthacecilia.near",
          },
        },
      ],
      shardId: 3,
      stateChanges: [
        {
          cause: {
            receiptHash: "3R2wjnktLwBKaceGiPetmShVAyHT2LuoQZMdNg6oWMwK",
            type: "receipt_processing",
          },
          change: {
            accountId: "marthacecilia.near",
            amount: "376417715605581247237588",
            codeHash: "7DcAdMUT1MjaZ9s7zhXdyxKvQsRsSfnmBGdzeZaquqDE",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 13722,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "BpZGWvbmx8sAMRsrhWyBnC5QHA9mFwist7orTceJTRvu",
            type: "receipt_processing",
          },
          change: {
            accountId: "olezha4.near",
            amount: "147297020835776249333187456",
            codeHash: "E8jZ1giWcVrps8PcV75ATauu6gFRkcwjNtKp7NKmipZG",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 25029,
          },
          type: "account_update",
        },
        {
          cause: {
            txHash: "AMdmdjfHvKX6vv1fNEyCCio2jmSvepxSetxQFhgj826f",
            type: "transaction_processing",
          },
          change: {
            accountId: "relay.aurora",
            amount: "2493412853875426176695038138",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 149094,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "CdUSBwV29D1P1qvxCwnbfNsTsdxfdRY6PxezsSWRFyqN",
            type: "receipt_processing",
          },
          change: {
            accountId: "relay.aurora",
            amount: "2493599939925361454422929590",
            codeHash: "11111111111111111111111111111111",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 149094,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            type: "receipt_processing",
          },
          change: {
            accountId: "token.sweat",
            amount: "32545059778997347633373318383",
            codeHash: "FMy4MTxATGtfxqTg5PZfGhQpRWej9Ppbttwo7FWF13wA",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 1648821628,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            type: "action_receipt_gas_reward",
          },
          change: {
            accountId: "token.sweat",
            amount: "32545059828330070072473318383",
            codeHash: "FMy4MTxATGtfxqTg5PZfGhQpRWej9Ppbttwo7FWF13wA",
            locked: "0",
            storagePaidAt: 0,
            storageUsage: 1648821628,
          },
          type: "account_update",
        },
        {
          cause: {
            receiptHash: "3R2wjnktLwBKaceGiPetmShVAyHT2LuoQZMdNg6oWMwK",
            type: "receipt_processing",
          },
          change: {
            accessKey: {
              nonce: 85297952000430,
              permission: {
                FunctionCall: {
                  allowance: "117616350729529600000000",
                  methodNames: [],
                  receiverId: "app.nearcrowd.near",
                },
              },
            },
            accountId: "marthacecilia.near",
            publicKey: "ed25519:8W28RYFfXztNA7ENP4VTaitsqEjSbABQJDqELwbwXswq",
          },
          type: "access_key_update",
        },
        {
          cause: {
            receiptHash: "BpZGWvbmx8sAMRsrhWyBnC5QHA9mFwist7orTceJTRvu",
            type: "receipt_processing",
          },
          change: {
            accessKey: {
              nonce: 84682948002117,
              permission: {
                FunctionCall: {
                  allowance: "330678248075353400000000",
                  methodNames: [],
                  receiverId: "app.nearcrowd.near",
                },
              },
            },
            accountId: "olezha4.near",
            publicKey: "ed25519:EnLNUDncRuw4AYLcGmi1Hr2YQ1DLu12VutsubZ6k8c2F",
          },
          type: "access_key_update",
        },
        {
          cause: {
            txHash: "AMdmdjfHvKX6vv1fNEyCCio2jmSvepxSetxQFhgj826f",
            type: "transaction_processing",
          },
          change: {
            accessKey: { nonce: 65788368017229, permission: "FullAccess" },
            accountId: "relay.aurora",
            publicKey: "ed25519:FptiMvPBN7QRJwroc2zJtTEAEo4h9CJAdGKQfd2bA3Qm",
          },
          type: "access_key_update",
        },
        {
          cause: {
            receiptHash: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            type: "receipt_processing",
          },
          change: {
            accountId: "token.sweat",
            keyBase64: "U1RBVEU=",
            valueBase64:
              "AgAAAHNpAQAAAAAAAAACAAAAc2UBAAAAdAEIAAAALnUuc3dlYXQUQEmH9+nGUg8Ez0cAAAAAWgAAAAAAAADiIbWN+QEAAA==",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            type: "receipt_processing",
          },
          change: {
            accountId: "token.sweat",
            keyBase64: "dAAEzAvKN2Ekj8gSsSzscbcviXEnrSF9E4Nn8XlqPYFyaw==",
            valueBase64: "6Hk2larECkgAAAAAAAAAAA==",
          },
          type: "data_update",
        },
        {
          cause: {
            receiptHash: "7Q29UAwrFbeMMM6niPSuMrqkp4Y21FYqJ1SXPvr9oZYU",
            type: "receipt_processing",
          },
          change: {
            accountId: "token.sweat",
            keyBase64: "dADCUiigKPOTAl1jqrFvCFMV6YPDQuu8kGehwLHx0CgpIw==",
            valueBase64: "AAAu48ylkU6WIwAAAAAAAA==",
          },
          type: "data_update",
        },
      ],
    },
  ],
};
const defaultCode = formatIndexingCode(
  `
  // Add your code here   
  const h = block.header().height
  await context.set('height', h);
`,
  true
);

const defaultSchema = `
CREATE TABLE "indexer_storage" ("function_name" TEXT NOT NULL, "key_name" TEXT NOT NULL, "value" TEXT NOT NULL, PRIMARY KEY ("function_name", "key_name"))
`;

const BLOCKHEIGHT_LIMIT = 3600;
const HASURA_ENDPOINT =
  process.env.NEXT_PUBLIC_HASURA_ENDPOINT ||
  "https://queryapi-hasura-graphql-24ktefolwq-ew.a.run.app/v1/graphql";
const Editor = ({
  options,
  accountId,
  indexerName,
  onLoadErrorText,
  actionButtonText,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);
  const [blockHeightError, setBlockHeightError] = useState(undefined);
  const [showResetCodeModel, setShowResetCodeModel] = useState(false);
  const [showGetBlockModalInput, setShowGetBlockModalInput] = useState(false);
  const [fileName, setFileName] = useState("indexingLogic.js");
  const [originalSQLCode, setOriginalSQLCode] = useState(defaultSchema);
  const [originalIndexingCode, setOriginalIndexingCode] = useState(defaultCode);

  const [indexingCode, setIndexingCode] = useState(defaultCode);
  const [schema, setSchema] = useState(defaultSchema);
  const [diffView, setDiffView] = useState(false);
  const [blockView, setBlockView] = useState(false);
  const [getBlockHeight, setGetBlockHeight] = useState(undefined);
  const [indexerNameField, setIndexerNameField] = useState(indexerName ?? "");
  const [selectedOption, setSelectedOption] = useState("latestBlockHeight");
  const [blockHeight, setBlockHeight] = useState(null);

  const { height } = useInitialPayload();
  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    setBlockHeightError(null);
  };

  useEffect(() => {
    if (selectedOption == "latestBlockHeight") {
      setBlockHeightError(null);
      return;
    }

    if (height - blockHeight > BLOCKHEIGHT_LIMIT) {
      setBlockHeightError(
        `Warning: Please enter a valid start block height. At the moment we only support historical indexing of the last ${BLOCKHEIGHT_LIMIT} blocks or ${
          BLOCKHEIGHT_LIMIT / 3600
        } hrs. Choose a start block height between ${
          height - BLOCKHEIGHT_LIMIT
        } - ${height}.`
      );
    } else if (blockHeight > height) {
      setBlockHeightError(
        `Warning: Start Block Hieght can not be in the future. Please choose a value between ${
          height - BLOCKHEIGHT_LIMIT
        } - ${height}.`
      );
    } else {
      setBlockHeightError(null);
    }
  }, [blockHeight, selectedOption]);

  const checkSQLSchemaFormatting = () => {
    try {
      let formatted_code = formatSQL(schema);
      let formatted_schema = formatted_code;
      return formatted_schema;
    } catch (error) {
      console.log("error", error);
      setError(
        () =>
          "Please check your SQL schema formatting and specify an Indexer Name"
      );
      return undefined;
    }
  };

  const getBlockValue = () => {
    request("get-block", {});
  };
  const registerFunction = async () => {
    let formatted_schema = checkSQLSchemaFormatting();

    const innerCode = indexingCode.match(
      /getBlock\s*\([^)]*\)\s*{([\s\S]*)}/
    )[1];
    if (indexerNameField == undefined || formatted_schema == undefined) {
      setError(
        () =>
          "Please check your SQL schema formatting and specify an Indexer Name"
      );
      return;
    }
    setError(() => undefined);
    let start_block_height = blockHeight;
    if (selectedOption == "latestBlockHeight") {
      start_block_height = null;
    }
    // Send a message to other sources
    request("register-function", {
      indexerName: indexerNameField.replaceAll(" ", "_"),
      code: innerCode,
      schema: formatted_schema,
      blockHeight: start_block_height,
    });
  };

  const graphQLFetcher = (graphQLParams) => {
    console.log(HASURA_ENDPOINT, "Hashura Endpoint");
    return fetch(HASURA_ENDPOINT, {
      method: "post",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Hasura-Role": accountId.replaceAll(".", "_"),
      },
      body: JSON.stringify(graphQLParams || {}),
    }).then((response) => response.json());
  };

  const handleReload = useCallback(async () => {
    if (options?.create_new_indexer === true) {
      // setIndexingCode(defaultCode);
      // setSchema(defaultSchema);
      setShowResetCodeModel(false);
      return;
    }

    const data = await queryIndexerFunctionDetails(accountId, indexerNameField);
    if (data == null) {
      setIndexingCode(defaultCode);
      setSchema(defaultSchema);
      setError(() => onLoadErrorText);
    } else {
      try {
        let unformatted_indexing_code = format_querried_code(data.code);
        let unformatted_schema = data.schema;
        if (unformatted_indexing_code !== null) {
          setOriginalIndexingCode(unformatted_indexing_code);
          setIndexingCode(unformatted_indexing_code);
        }
        if (unformatted_schema !== null) {
          setOriginalSQLCode(unformatted_schema);
          setSchema(unformatted_schema);
        }
        if (data.start_block_height) {
          setSelectedOption("specificBlockHeight");
          setBlockHeight(data.start_block_height);
        }
      } catch (error) {
        console.log(error);
        setError(() => "An Error occured while trying to format the code.");
      }
    }

    setShowResetCodeModel(false);
  }, [
    accountId,
    indexerNameField,
    onLoadErrorText,
    options?.create_new_indexer,
  ]);

  const format_querried_code = (code) => {
    try {
      let formatted_code = formatIndexingCode(code, true);
      setError(() => undefined);
      return formatted_code;
    } catch (error) {
      setError(
        () =>
          "Oh snap! We could not format the queried code. The code in the registry contract may be invalid Javascript code. "
      );
      console.log(error);
      return unformatted_code;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await handleReload();
      setLoading(false);
    };
    load();
  }, [accountId, handleReload, indexerName]);

  const handleFormattingError = (fileName) => {
    const errorMessage =
      fileName === "indexingLogic.js"
        ? "Oh snap! We could not format your code. Make sure it is proper Javascript code."
        : "Oh snap! We could not format your SQL schema. Make sure it is proper SQL DDL";

    setError(() => errorMessage);
  };

  const reformat = () => {
    return new Promise((resolve, reject) => {
      try {
        let formattedCode;
        if (fileName === "indexingLogic.js") {
          formattedCode = formatIndexingCode(indexingCode, false);
          setIndexingCode(formattedCode);
        } else if (fileName === "schema.sql") {
          formattedCode = formatSQL(schema);
          setSchema(formattedCode);
        }
        setError(() => undefined);
        resolve(formattedCode);
      } catch (error) {
        handleFormattingError(fileName);
        reject(error);
      }
    });
  };

  async function handleFormating() {
    await reformat();
  }

  async function submit() {
    // Handle Register button click
    await reformat();
    await registerFunction();
  }

  function handleEditorMount(editor) {
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent((_) => {
      if (fileName == "indexingLogic.js") {
        setIndexingCode(modifiedEditor.getValue());
      }
      if (fileName == "schema.sql") {
        setSchema(modifiedEditor.getValue());
      }
    });
  }

  function handleEditorWillMount(monaco) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `${primitives}}`,
      "file:///node_modules/@near-lake/primitives/index.d.ts"
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {
        <>
          <ButtonToolbar
            className="pt-3 pb-1 flex-col"
            aria-label="Actions for Editor"
          >
            <IndexerDetailsGroup
              accountId={accountId}
              indexerNameField={indexerNameField}
              setIndexerNameField={setIndexerNameField}
              isCreateNewIndexerPage={options.create_new_indexer}
            />
            <BlockHeightOptions
              selectedOption={selectedOption}
              handleOptionChange={handleOptionChange}
              blockHeight={blockHeight}
              setBlockHeight={setBlockHeight}
            />
            <ButtonGroup
              className="px-3 pt-3"
              style={{ width: "100%" }}
              aria-label="Action Button Group"
            >
              <Button
                variant="secondary"
                className="px-3"
                onClick={() => setShowResetCodeModel(true)}
              >
                {" "}
                Reset
              </Button>{" "}
              <Button
                variant="secondary"
                className="px-3"
                onClick={() => handleFormating()}
              >
                {" "}
                Format Code
              </Button>{" "}
              <Button
                variant="primary"
                className="px-3"
                onClick={() => submit()}
              >
                {actionButtonText}
              </Button>
            </ButtonGroup>
          </ButtonToolbar>
        </>
      }
      <Modal
        show={showResetCodeModel}
        onHide={() => setShowResetCodeModel(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Are you sure?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          The changes you have made in the editor will be deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowResetCodeModel(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleReload()}>
            Reload
          </Button>
        </Modal.Footer>
      </Modal>

      <div
        className="px-3"
        style={{
          flex: "display",
          justifyContent: "space-around",
          width: "100%",
        }}
      >
        {error && (
          <Alert className="px-3 pt-3" variant="danger">
            {error}
          </Alert>
        )}
        {blockHeightError && (
          <Alert className="px-3 pt-3" variant="danger">
            {blockHeightError}
          </Alert>
        )}

        <Modal
          show={showGetBlockModalInput}
          onHide={() => setShowGetBlockModalInput(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Select A Blockheight</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <input
              type="number"
              value={getBlockHeight || blockHeight}
              onChange={(e) => setGetBlockHeight(e.value)}
              aria-label="Input blockheight"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowResetCodeModel(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                getBlockValue().then((response) =>
                  setBlock(response.data.block)
                )
              }
            >
              Get Block Details
            </Button>
          </Modal.Footer>
        </Modal>

        <div
          className="px-3"
          style={{
            flex: "display",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          {error && (
            <Alert className="px-3 pt-3" variant="danger">
              {error}
            </Alert>
          )}
          {blockHeightError && (
            <Alert className="px-3 pt-3" variant="danger">
              {blockHeightError}
            </Alert>
          )}

          <ToggleButtonGroup
            type="radio"
            style={{ backgroundColor: "white" }}
            name="options"
            defaultValue={"indexingLogic.js"}
          >
            <ToggleButton
              id="tbg-radio-1"
              style={{
                backgroundColor:
                  fileName === "indexingLogic.js" ? "blue" : "grey",
                borderRadius: "0px",
              }}
              value={"indexingLogic.js"}
              onClick={() => setFileName("indexingLogic.js")}
            >
              indexingLogic.js
            </ToggleButton>
            <ToggleButton
              id="tbg-radio-2"
              style={{
                backgroundColor: fileName === "schema.sql" ? "blue" : "grey",
                borderRadius: "0px",
              }}
              value={"schema.sql"}
              onClick={() => setFileName("schema.sql")}
            >
              schema.sql
            </ToggleButton>
            <ToggleButton
              id="tbg-radio-3"
              style={{
                backgroundColor: fileName === "GraphiQL" ? "blue" : "grey",
                borderRadius: "0px",
              }}
              value={"GraphiQL"}
              onClick={() => setFileName("GraphiQL")}
            >
              GraphiQL
            </ToggleButton>
            <InputGroup>
              <InputGroup.Text className="px-3">
                {" "}
                Diff View
                <Switch
                  className="px-1"
                  checked={diffView}
                  onChange={(checked) => {
                    setDiffView(checked);
                  }}
                />
              </InputGroup.Text>
            </InputGroup>
            <InputGroup>
              <InputGroup.Text className="px-3">
                {" "}
                Block View
                <Switch
                  className="px-1"
                  checked={blockView}
                  onChange={(checked) => {
                    setBlockView(checked);
                  }}
                />
              </InputGroup.Text>
            </InputGroup>
          </ToggleButtonGroup>

          {fileName === "GraphiQL" && (
            <div style={{ width: "100%", height: "50vh" }}>
              <GraphiQL
                fetcher={graphQLFetcher}
                defaultQuery=""
                storage={sessionStorage}
              />
            </div>
          )}
          {fileName === "indexingLogic.js" &&
            (diffView ? (
              <DiffEditor
                original={originalIndexingCode}
                modified={indexingCode}
                height="50vh"
                width="100%"
                language="javascript"
                theme="vs-dark"
                onMount={handleEditorMount}
                options={{ ...options, readOnly: false }}
              />
            ) : (
              <MonacoEditor
                value={indexingCode}
                height="50vh"
                width="100%"
                defaultValue={defaultCode}
                defaultLanguage="typescript"
                theme="vs-dark"
                onChange={(text) => setIndexingCode(text)}
                beforeMount={handleEditorWillMount}
                options={{ ...options, readOnly: false }}
              />
            ))}
          {fileName === "schema.sql" &&
            (diffView ? (
              <DiffEditor
                original={originalSQLCode}
                modified={schema}
                height="50vh"
                width="100%"
                language="sql"
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  ...options,
                  readOnly: options?.create_new_indexer === true ? false : true,
                }}
              />
            ) : (
              <MonacoEditor
                value={schema}
                height="50vh"
                width="100%"
                defaultValue={defaultSchema}
                defaultLanguage="sql"
                theme="vs-dark"
                onChange={(text) => setSchema(text)}
                options={{
                  ...options,
                  readOnly:
                    options?.create_new_indexer === true ? false : false,
                }}
              />
            ))}
          <PanelGroup storage={sessionStorage} direction="horizontal">
            <Panel>
              <div>
                <JsonViewer
                  value={block_details}
                  theme="dark"
                  onCopy={(path, value) => console.log("copy", path, value)}
                  onSelect={(path, value) => console.log(path, value, "val")}
                />
              </div>
            </Panel>
            <PanelResizeHandle />
            <Panel>
              <div>
                <div
                  style={{
                    height: "50vh",
                    width: "100%",
                    backgroundColor: "red",
                  }}
                ></div>
                {/* <JsonVViewer */}
                {/*   value={block_details} */}
                {/*   theme="dark" */}
                {/*   onCopy={(path, value) => console.log("copy", path, value)} */}
                {/*   onSelect={(path, value) => console.log(path, value, "val")} */}
                {/* /> */}
              </div>
            </Panel>
          </PanelGroup>
          {/* {blockView && ( */}
          {/*     <Button */}
          {/*       variant="secondary" */}
          {/*       className="px-3" */}
          {/*       onClick={() => setShowGetBlockModalInput(true)} */}
          {/*     > */}
          {/*       {" "} */}
          {/*       Get Block */}
          {/*     </Button> */}
          {/*   ) && */}
          {/*   (fileName === "indexingLogic.js" || fileName === "schema.sql") && */}
          {/*     <div style={{ width: "100%", height: "50vh" }}> */}
          {/*     blockView && ( */}
          {/*       <JsonViewer */}
          {/*         value={block_details} */}
          {/*         theme="dark" */}
          {/*         onCopy={(path, value) => console.log("copy", path, value)} */}
          {/*         onSelect={(path, value) => console.log(path, value, "val")} */}
          {/*       /> */}
          {/*     </div> */}
          {/*   )} */}
        </div>
      </div>
    </div>
  );
};
export default Editor;
