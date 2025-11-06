import { parseAbi } from "viem";

// USDC Token ABI (ERC20)
export const USDC_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
]);

// Morpho Vault ABI (ERC4626)
export const MORPHO_VAULT_ABI = parseAbi([
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)",
  "function balanceOf(address account) external view returns (uint256)",
  "function maxWithdraw(address owner) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
]);

// Aave V3 Pool ABI
export const AAVE_POOL_ABI = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

// Contract addresses on Base
export const BASE_ADDRESSES = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  AAVE_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", // Aave V3 Pool on Base
} as const;

export const BASE_CHAIN_ID = 8453;

