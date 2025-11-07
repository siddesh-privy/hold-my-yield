import { NextResponse } from "next/server";
import {
  MORPHO_API_URL,
  AAVE_API_URL,
  AAVE_V3_POOL_BASE,
  BASE_CHAIN_ID,
} from "@/lib/CONSTANTS";

const MORPHO_TRANSACTIONS_QUERY = `
  query GetUserTransactions($chainId: Int!, $address: String!) {
    userByAddress(chainId: $chainId, address: $address) {
      address
      transactions {
        id
        hash
        timestamp
        type
        data {
          ... on VaultTransactionData {
            assets
            assetsUsd
            vault {
              address
              name
            }
          }
        }
      }
    }
  }
`;

const AAVE_TRANSACTIONS_QUERY = `
  query GetUserTransactions($market: EvmAddress!, $user: EvmAddress!, $chainId: ChainId!) {
    userTransactionHistory(
      request: {
        market: $market
        user: $user
        chainId: $chainId
        filter: [SUPPLY, WITHDRAW]
        orderBy: { date: DESC }
        pageSize: FIFTY
      }
    ) {
      items {
        ... on UserSupplyTransaction {
          txHash
          timestamp
          amount {
            usd
            amount {
              value
            }
          }
          reserve {
            market {
              name
            }
            underlyingToken {
              address
              symbol
            }
          }
        }
        ... on UserWithdrawTransaction {
          txHash
          timestamp
          amount {
            usd
            amount {
              value
            }
          }
          reserve {
            market {
              name
            }
            underlyingToken {
              address
              symbol
            }
          }
        }
      }
    }
  }
`;

export interface Transaction {
  id: string;
  protocol: "morpho" | "aave-v3";
  type: "deposit" | "withdraw";
  hash: string;
  timestamp: number;
  amount: {
    formatted: string;
    usd: number;
  };
  vaultName: string;
  vaultAddress: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("address");

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Fetch transactions from both Morpho and Aave
    const [morphoResponse, aaveResponse] = await Promise.all([
      fetch(MORPHO_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: MORPHO_TRANSACTIONS_QUERY,
          variables: {
            chainId: BASE_CHAIN_ID,
            address: userAddress.toLowerCase(),
          },
        }),
        cache: "no-store",
      }).catch((error) => {
        console.error("Error fetching Morpho transactions:", error);
        return null;
      }),

      fetch(AAVE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: AAVE_TRANSACTIONS_QUERY,
          variables: {
            market: AAVE_V3_POOL_BASE,
            user: userAddress,
            chainId: BASE_CHAIN_ID,
          },
        }),
        cache: "no-store",
      }).catch((error) => {
        console.error("Error fetching Aave transactions:", error);
        return null;
      }),
    ]);

    const allTransactions: Transaction[] = [];

    // Process Morpho transactions
    if (morphoResponse) {
      const morphoData = await morphoResponse.json();
      if (
        morphoData.data?.userByAddress?.transactions &&
        Array.isArray(morphoData.data.userByAddress.transactions)
      ) {
        morphoData.data.userByAddress.transactions.forEach(
          (tx: {
            id: string;
            hash: string;
            timestamp: number;
            type: string;
            data: {
              assets: string;
              assetsUsd: number;
              vault: {
                address: string;
                name: string;
              };
            };
          }) => {
            // Only process MetaMorpho deposit and withdraw transactions
            if (
              (tx.type === "MetaMorphoDeposit" ||
                tx.type === "MetaMorphoWithdraw") &&
              tx.data?.vault
            ) {
              allTransactions.push({
                id: `morpho:${tx.id}`,
                protocol: "morpho",
                type: tx.type === "MetaMorphoDeposit" ? "deposit" : "withdraw",
                hash: tx.hash,
                timestamp: tx.timestamp,
                amount: {
                  formatted: (parseFloat(tx.data.assets) / 1e6).toFixed(2),
                  usd: tx.data.assetsUsd || 0,
                },
                vaultName: tx.data.vault.name,
                vaultAddress: tx.data.vault.address,
              });
            }
          }
        );
      }
    }

    // Process Aave transactions
    if (aaveResponse) {
      const aaveData = await aaveResponse.json();
      if (
        aaveData.data?.userTransactionHistory?.items &&
        Array.isArray(aaveData.data.userTransactionHistory.items)
      ) {
        aaveData.data.userTransactionHistory.items.forEach(
          (tx: {
            txHash: string;
            timestamp: string;
            amount: {
              usd: string;
              amount: {
                value: string;
              };
            };
            reserve: {
              market: {
                name: string;
              };
              underlyingToken: {
                address: string;
                symbol: string;
              };
            };
            __typename: string;
          }) => {
            allTransactions.push({
              id: `aave:${tx.txHash}`,
              protocol: "aave-v3",
              type:
                tx.__typename === "UserSupplyTransaction"
                  ? "deposit"
                  : "withdraw",
              hash: tx.txHash,
              timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
              amount: {
                formatted: parseFloat(tx.amount.amount.value).toFixed(2),
                usd: parseFloat(tx.amount.usd),
              },
              vaultName: tx.reserve.market.name,
              vaultAddress: tx.reserve.underlyingToken.address,
            });
          }
        );
      }
    }

    // Sort all transactions by timestamp (most recent first)
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      count: allTransactions.length,
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user transactions",
      },
      { status: 500 }
    );
  }
}
