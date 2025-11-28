"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AgentWallet: () => AgentWallet,
  AutoPilot: () => AutoPilot,
  LiquidityPool: () => LiquidityPool,
  MarketAnalysis: () => MarketAnalysis,
  SwapRouter: () => SwapRouter
});
module.exports = __toCommonJS(index_exports);

// src/SwapRouter.ts
var import_algosdk = __toESM(require("algosdk"));
var import_axios = __toESM(require("axios"));
var SwapRouter = class {
  constructor(config) {
    this.pools = [];
    this.initialized = false;
    if (typeof config === "string") {
      this.network = config;
      this.algodClient = this.createDefaultAlgodClient(config);
      this.apiBaseUrl = config === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api";
    } else {
      this.network = config.network;
      this.apiBaseUrl = config.apiBaseUrl || (config.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api");
      if (config.algodUrl) {
        this.algodClient = new import_algosdk.Algodv2(
          config.algodToken || "",
          config.algodUrl,
          config.algodPort || ""
        );
      } else {
        this.algodClient = this.createDefaultAlgodClient(config.network);
      }
    }
  }
  createDefaultAlgodClient(network) {
    if (network === "mainnet") {
      return new import_algosdk.Algodv2("", "https://mainnet-api.4160.nodely.io", "");
    }
    return new import_algosdk.Algodv2("", "https://testnet-api.4160.nodely.io", "");
  }
  /**
   * Initialize the router by fetching all available pools
   */
  async initialize() {
    try {
      const response = await import_axios.default.get(`${this.apiBaseUrl}/pools/all`, {
        params: { network: this.network }
      });
      if (response.data.pools) {
        this.pools = response.data.pools;
        this.initialized = true;
      } else {
        throw new Error("Failed to fetch pools");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to initialize SwapRouter");
    }
  }
  /**
   * Find the best route for a swap across all DEXs
   */
  async findBestRoute(request) {
    if (!this.initialized) {
      throw new Error("SwapRouter not initialized. Call initialize() first.");
    }
    try {
      const response = await import_axios.default.get(`${this.apiBaseUrl}/router/quote`, {
        params: {
          assetIn: request.assetIn,
          assetOut: request.assetOut,
          amount: request.amount,
          slippage: request.slippage || 0.5,
          maxHops: request.maxHops || 3,
          network: this.network
        }
      });
      if (response.data.ok && response.data.quote) {
        return response.data.quote;
      } else {
        throw new Error(response.data.error || "Failed to get quote");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to find best route");
    }
  }
  /**
   * Build unsigned swap transaction
   */
  async buildSwapTransaction(quote, sender) {
    try {
      const response = await import_axios.default.post(`${this.apiBaseUrl}/swap/prepare`, {
        quote,
        sender,
        network: this.network
      });
      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, "base64");
        return import_algosdk.default.decodeUnsignedTransaction(txnBytes);
      } else {
        throw new Error(response.data.error || "Failed to build transaction");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to build swap transaction");
    }
  }
  /**
   * Get all available pools
   */
  getPools() {
    return this.pools;
  }
  /**
   * Get pools for a specific asset pair
   */
  getPoolsForPair(asset1, asset2) {
    return this.pools.filter(
      (pool) => pool.asset1 === asset1 && pool.asset2 === asset2 || pool.asset1 === asset2 && pool.asset2 === asset1
    );
  }
  /**
   * Get the Algod client instance
   */
  getAlgodClient() {
    return this.algodClient;
  }
  /**
   * Get current network
   */
  getNetwork() {
    return this.network;
  }
  handleError(error, message) {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`);
    }
    return new Error(`${message}: ${error.message}`);
  }
};

// src/AgentWallet.ts
var import_algosdk2 = __toESM(require("algosdk"));
var import_axios2 = __toESM(require("axios"));
var AgentWallet = class _AgentWallet {
  constructor(account, algodClient, network, apiBaseUrl) {
    this.account = account;
    this.algodClient = algodClient;
    this.network = network;
    this.apiBaseUrl = apiBaseUrl;
  }
  /**
   * Create a new agent wallet
   */
  static async create(userAddress, password, config) {
    const { algodClient, network, apiBaseUrl } = _AgentWallet.parseConfig(config || "testnet");
    try {
      const response = await import_axios2.default.post(`${apiBaseUrl}/agent`, {
        action: "create",
        userAddress,
        password,
        network
      });
      if (response.data.ok && response.data.mnemonic) {
        const account = import_algosdk2.default.mnemonicToSecretKey(response.data.mnemonic);
        return new _AgentWallet(account, algodClient, network, apiBaseUrl);
      } else {
        throw new Error(response.data.error || "Failed to create agent wallet");
      }
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to create agent wallet");
    }
  }
  /**
   * Recover an existing agent wallet
   */
  static async recover(userAddress, password, config) {
    const { algodClient, network, apiBaseUrl } = _AgentWallet.parseConfig(config || "testnet");
    try {
      const response = await import_axios2.default.post(`${apiBaseUrl}/agent`, {
        action: "recover",
        userAddress,
        password,
        network
      });
      if (response.data.ok && response.data.mnemonic) {
        const account = import_algosdk2.default.mnemonicToSecretKey(response.data.mnemonic);
        return new _AgentWallet(account, algodClient, network, apiBaseUrl);
      } else {
        throw new Error(response.data.error || "Failed to recover agent wallet");
      }
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to recover agent wallet");
    }
  }
  /**
   * Get wallet address
   */
  getAddress() {
    return this.account.addr.toString();
  }
  /**
   * Get wallet balance and holdings
   */
  async getBalance() {
    try {
      const accountInfo = await this.algodClient.accountInformation(this.account.addr).do();
      const assets = (accountInfo.assets || []).map((asset) => ({
        assetId: asset["asset-id"],
        balance: asset.amount,
        symbol: "ASA",
        decimals: 0
      }));
      return {
        algo: Number(accountInfo.amount) / 1e6,
        availableBalance: (Number(accountInfo.amount) - Number(accountInfo.minBalance)) / 1e6,
        assets
      };
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to get balance");
    }
  }
  /**
   * Opt-in to an asset
   */
  async optIn(assetId) {
    try {
      const params = await this.algodClient.getTransactionParams().do();
      const txn = import_algosdk2.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: this.account.addr,
        receiver: this.account.addr,
        amount: 0,
        assetIndex: assetId,
        suggestedParams: params
      });
      const signedTxn = txn.signTxn(this.account.sk);
      const response = await this.algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      const confirmedTxn = await import_algosdk2.default.waitForConfirmation(this.algodClient, txId, 4);
      return {
        txId,
        confirmedRound: confirmedTxn.confirmedRound ? Number(confirmedTxn.confirmedRound) : void 0
      };
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to opt-in to asset");
    }
  }
  /**
   * Transfer ALGO or ASA
   */
  async transfer(params) {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      let txn;
      if (params.assetId === 0) {
        txn = import_algosdk2.default.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.account.addr,
          receiver: params.to,
          amount: BigInt(params.amount),
          note: params.note ? new TextEncoder().encode(params.note) : void 0,
          suggestedParams
        });
      } else {
        txn = import_algosdk2.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account.addr,
          receiver: params.to,
          amount: BigInt(params.amount),
          assetIndex: params.assetId,
          note: params.note ? new TextEncoder().encode(params.note) : void 0,
          suggestedParams
        });
      }
      const signedTxn = txn.signTxn(this.account.sk);
      const response = await this.algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      const confirmedTxn = await import_algosdk2.default.waitForConfirmation(this.algodClient, txId, 4);
      return {
        txId,
        confirmedRound: confirmedTxn.confirmedRound ? Number(confirmedTxn.confirmedRound) : void 0
      };
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to transfer");
    }
  }
  /**
   * Execute a swap using a quote
   */
  async swap(quote) {
    try {
      const response = await import_axios2.default.post(`${this.apiBaseUrl}/swap/prepare`, {
        quote,
        sender: this.account.addr,
        network: this.network
      });
      if (!response.data.ok || !response.data.txn) {
        throw new Error(response.data.error || "Failed to prepare swap");
      }
      const txnBytes = Buffer.from(response.data.txn, "base64");
      const txn = import_algosdk2.default.decodeUnsignedTransaction(txnBytes);
      const signedTxn = txn.signTxn(this.account.sk);
      const submitResponse = await import_axios2.default.post(`${this.apiBaseUrl}/swap/submit`, {
        signedTxn: Buffer.from(signedTxn).toString("base64"),
        assetIn: quote.assetIn,
        assetOut: quote.assetOut,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        sender: this.account.addr,
        network: this.network
      });
      if (submitResponse.data.ok) {
        return {
          txId: submitResponse.data.txId,
          confirmedRound: submitResponse.data.confirmedRound
        };
      } else {
        throw new Error(submitResponse.data.error || "Failed to submit swap");
      }
    } catch (error) {
      throw _AgentWallet.handleError(error, "Failed to execute swap");
    }
  }
  /**
   * Get the Algod client
   */
  getAlgodClient() {
    return this.algodClient;
  }
  /**
   * Get the network
   */
  getNetwork() {
    return this.network;
  }
  static parseConfig(config) {
    if (typeof config === "string") {
      const network = config;
      const algodClient = network === "mainnet" ? new import_algosdk2.Algodv2("", "https://mainnet-api.4160.nodely.io", "") : new import_algosdk2.Algodv2("", "https://testnet-api.4160.nodely.io", "");
      const apiBaseUrl = network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api";
      return { algodClient, network, apiBaseUrl };
    } else {
      const network = config.network;
      const algodClient = config.algodUrl ? new import_algosdk2.Algodv2(config.algodToken || "", config.algodUrl, config.algodPort || "") : network === "mainnet" ? new import_algosdk2.Algodv2("", "https://mainnet-api.4160.nodely.io", "") : new import_algosdk2.Algodv2("", "https://testnet-api.4160.nodely.io", "");
      const apiBaseUrl = config.apiBaseUrl || (network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api");
      return { algodClient, network, apiBaseUrl };
    }
  }
  static handleError(error, message) {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`);
    }
    return new Error(`${message}: ${error.message}`);
  }
};

// src/AutoPilot.ts
var import_axios3 = __toESM(require("axios"));
var AutoPilot = class {
  constructor(config, contractId) {
    if (typeof config === "string") {
      this.network = config;
      this.apiBaseUrl = config === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api";
    } else {
      this.network = config.network;
      this.apiBaseUrl = config.apiBaseUrl || (config.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api");
    }
    this.contractId = contractId;
  }
  /**
   * Create a new automated trading rule
   */
  async createRule(config, ownerAddress) {
    try {
      const payload = {
        ownerAddress,
        type: config.strategy.toLowerCase(),
        targets: config.targets || [],
        triggerType: config.trigger.type,
        dropPercent: config.trigger.value,
        trendWindow: config.trigger.window,
        trendThreshold: config.trigger.threshold,
        momentumLookback: config.trigger.lookback,
        momentumThreshold: config.trigger.threshold,
        maxSpendUSD: config.maxSpendUSD,
        maxSlippage: config.maxSlippage,
        cooldownMinutes: config.cooldownMinutes,
        rotateTopN: config.rotateTopN,
        status: "active",
        network: this.network
      };
      const response = await import_axios3.default.post(`${this.apiBaseUrl}/rules`, payload);
      if (response.data.ok && response.data.rule) {
        return response.data.rule;
      } else {
        throw new Error(response.data.error || "Failed to create rule");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to create rule");
    }
  }
  /**
   * Get all rules for a user
   */
  async getRules(ownerAddress) {
    try {
      const response = await import_axios3.default.get(`${this.apiBaseUrl}/rules`, {
        params: {
          owner: ownerAddress,
          network: this.network
        }
      });
      if (response.data.ok && response.data.rules) {
        return response.data.rules;
      } else {
        throw new Error(response.data.error || "Failed to fetch rules");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch rules");
    }
  }
  /**
   * Get a specific rule by ID
   */
  async getRule(ruleId, ownerAddress) {
    try {
      const response = await import_axios3.default.get(`${this.apiBaseUrl}/rules/${ruleId}`, {
        params: {
          owner: ownerAddress,
          network: this.network
        }
      });
      if (response.data.ok && response.data.rule) {
        return response.data.rule;
      } else {
        throw new Error(response.data.error || "Failed to fetch rule");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch rule");
    }
  }
  /**
   * Update rule status (pause/resume/cancel)
   */
  async updateRuleStatus(ruleId, status, ownerAddress) {
    try {
      const response = await import_axios3.default.patch(`${this.apiBaseUrl}/rules`, {
        id: ruleId,
        owner: ownerAddress,
        status,
        network: this.network
      });
      if (!response.data.ok) {
        throw new Error(response.data.error || "Failed to update rule status");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to update rule status");
    }
  }
  /**
   * Update rule parameters
   */
  async updateRuleParameters(ruleId, ownerAddress, updates) {
    try {
      const response = await import_axios3.default.patch(`${this.apiBaseUrl}/rules`, {
        id: ruleId,
        owner: ownerAddress,
        ...updates,
        network: this.network
      });
      if (!response.data.ok) {
        throw new Error(response.data.error || "Failed to update rule parameters");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to update rule parameters");
    }
  }
  /**
   * Manually execute a rule
   */
  async executeRule(ruleId, ownerAddress) {
    try {
      const response = await import_axios3.default.post(`${this.apiBaseUrl}/rules/execute`, {
        id: ruleId,
        owner: ownerAddress,
        network: this.network
      });
      if (response.data.ok && response.data.txId) {
        return {
          txId: response.data.txId,
          confirmedRound: response.data.confirmedRound
        };
      } else {
        throw new Error(response.data.error || "Failed to execute rule");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to execute rule");
    }
  }
  /**
   * Delete a rule
   */
  async deleteRule(ruleId, ownerAddress) {
    try {
      const response = await import_axios3.default.delete(`${this.apiBaseUrl}/rules`, {
        params: {
          id: ruleId,
          owner: ownerAddress,
          network: this.network
        }
      });
      if (!response.data.ok) {
        throw new Error(response.data.error || "Failed to delete rule");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to delete rule");
    }
  }
  /**
   * Get rule execution statistics
   */
  async getRuleStats(ruleId, ownerAddress) {
    try {
      const rule = await this.getRule(ruleId, ownerAddress);
      return {
        totalExecutions: rule.totalExecutions,
        totalSpent: rule.totalSpent,
        lastExecuted: rule.lastExecuted
      };
    } catch (error) {
      throw this.handleError(error, "Failed to fetch rule stats");
    }
  }
  handleError(error, message) {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`);
    }
    return new Error(`${message}: ${error.message}`);
  }
};

// src/MarketAnalysis.ts
var import_axios4 = __toESM(require("axios"));
var MarketAnalysis = class _MarketAnalysis {
  constructor(config) {
    if (!config || typeof config === "string") {
      this.network = config || "testnet";
      this.apiBaseUrl = this.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api";
    } else {
      this.network = config.network;
      this.apiBaseUrl = config.apiBaseUrl || (config.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api");
    }
  }
  /**
   * Analyze a cryptocurrency with AI
   */
  async analyze(request) {
    try {
      const response = await import_axios4.default.post(`${this.apiBaseUrl}/mcp/analyze`, {
        coin: request.coin,
        horizonDays: request.horizonDays || 30,
        granularity: request.granularity || "1d",
        tasks: request.tasks || ["analysis", "prediction", "strategy", "charts"],
        chartType: request.chartType || "candlestick",
        network: this.network
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to analyze cryptocurrency");
    }
  }
  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex() {
    try {
      const response = await import_axios4.default.get(`${this.apiBaseUrl}/mcp/fear-greed`);
      if (response.data.ok && response.data.index) {
        return response.data.index;
      } else {
        throw new Error(response.data.error || "Failed to fetch Fear & Greed Index");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch Fear & Greed Index");
    }
  }
  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCoins() {
    try {
      const response = await import_axios4.default.get(`${this.apiBaseUrl}/mcp/trending`);
      if (response.data.ok && response.data.trending) {
        return response.data.trending;
      } else {
        throw new Error(response.data.error || "Failed to fetch trending coins");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch trending coins");
    }
  }
  /**
   * Get trending Algorand ecosystem tokens
   */
  async getTrendingAlgorandTokens() {
    try {
      const response = await import_axios4.default.get(`${this.apiBaseUrl}/mcp/trending/algorand`);
      if (response.data.ok && response.data.trending) {
        return response.data.trending;
      } else {
        throw new Error(response.data.error || "Failed to fetch Algorand trending tokens");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch Algorand trending tokens");
    }
  }
  /**
   * Get cryptocurrency news
   */
  async getNews(coinId, limit = 5) {
    try {
      const response = await import_axios4.default.get(`${this.apiBaseUrl}/mcp/news`, {
        params: { coinId, limit }
      });
      if (response.data.ok && response.data.news) {
        return response.data.news;
      } else {
        throw new Error(response.data.error || "Failed to fetch news");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch news");
    }
  }
  /**
   * Get quick price for a coin
   */
  async getPrice(coinId) {
    try {
      const analysis = await this.analyze({
        coin: coinId,
        horizonDays: 1,
        tasks: ["analysis"]
      });
      if (analysis.ok && analysis.marketData) {
        return {
          price: analysis.marketData.price,
          priceChange24h: analysis.marketData.priceChangePercentage24h,
          marketCap: analysis.marketData.marketCap,
          volume24h: analysis.marketData.volume24h
        };
      } else {
        throw new Error("Failed to fetch price data");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch price");
    }
  }
  /**
   * Compare multiple cryptocurrencies
   */
  async compare(coins) {
    try {
      const results = await Promise.all(
        coins.map((coin) => this.getPrice(coin))
      );
      return coins.map((coin, index) => ({
        coin,
        ...results[index]
      }));
    } catch (error) {
      throw this.handleError(error, "Failed to compare cryptocurrencies");
    }
  }
  handleError(error, message) {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`);
    }
    return new Error(`${message}: ${error.message}`);
  }
  /**
   * Static methods for quick access without instantiation
   */
  static async quickAnalyze(coin, network = "testnet") {
    const instance = new _MarketAnalysis(network);
    return instance.analyze({ coin });
  }
  static async quickPrice(coin, network = "testnet") {
    const instance = new _MarketAnalysis(network);
    const data = await instance.getPrice(coin);
    return data.price;
  }
};

// src/LiquidityPool.ts
var import_algosdk3 = __toESM(require("algosdk"));
var import_axios5 = __toESM(require("axios"));
var LiquidityPool = class {
  constructor(poolAppId, config) {
    this.poolAppId = poolAppId;
    if (!config || typeof config === "string") {
      this.network = config || "testnet";
      this.algodClient = this.createDefaultAlgodClient(this.network);
      this.apiBaseUrl = this.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api";
    } else {
      this.network = config.network;
      this.apiBaseUrl = config.apiBaseUrl || (config.network === "mainnet" ? "https://10xswap.com/api" : "http://localhost:3000/api");
      if (config.algodUrl) {
        this.algodClient = new import_algosdk3.Algodv2(
          config.algodToken || "",
          config.algodUrl,
          config.algodPort || ""
        );
      } else {
        this.algodClient = this.createDefaultAlgodClient(config.network);
      }
    }
  }
  createDefaultAlgodClient(network) {
    if (network === "mainnet") {
      return new import_algosdk3.Algodv2("", "https://mainnet-api.4160.nodely.io", "");
    }
    return new import_algosdk3.Algodv2("", "https://testnet-api.4160.nodely.io", "");
  }
  /**
   * Get pool information
   */
  async getPoolInfo() {
    try {
      const response = await import_axios5.default.get(`${this.apiBaseUrl}/pools/${this.poolAppId}`, {
        params: { network: this.network }
      });
      if (response.data.ok && response.data.pool) {
        return response.data.pool;
      } else {
        throw new Error(response.data.error || "Failed to fetch pool info");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to fetch pool info");
    }
  }
  /**
   * Get swap quote without executing
   */
  async getSwapQuote(assetIn, amountIn) {
    try {
      const response = await import_axios5.default.get(`${this.apiBaseUrl}/pools/${this.poolAppId}/quote`, {
        params: {
          assetIn,
          amountIn,
          network: this.network
        }
      });
      if (response.data.ok && response.data.quote) {
        return response.data.quote;
      } else {
        throw new Error(response.data.error || "Failed to get quote");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to get swap quote");
    }
  }
  /**
   * Create a new pool (permissionless)
   */
  async createPool(asset1, asset2, feeBps, senderAddress) {
    try {
      const response = await import_axios5.default.post(`${this.apiBaseUrl}/pools/create`, {
        asset1,
        asset2,
        feeBps,
        sender: senderAddress,
        network: this.network
      });
      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, "base64");
        return import_algosdk3.default.decodeUnsignedTransaction(txnBytes);
      } else {
        throw new Error(response.data.error || "Failed to build create pool transaction");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to create pool");
    }
  }
  /**
   * Add liquidity to pool
   */
  async addLiquidity(params, senderAddress) {
    try {
      const response = await import_axios5.default.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/add-liquidity`, {
        amount1: params.amount1,
        amount2: params.amount2,
        minLpTokens: params.minLpTokens,
        sender: senderAddress,
        network: this.network
      });
      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, "base64");
        return import_algosdk3.default.decodeUnsignedTransaction(txnBytes);
      } else {
        throw new Error(response.data.error || "Failed to build add liquidity transaction");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to add liquidity");
    }
  }
  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(lpTokens, minAmount1, minAmount2, senderAddress) {
    try {
      const response = await import_axios5.default.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/remove-liquidity`, {
        lpTokens,
        minAmount1,
        minAmount2,
        sender: senderAddress,
        network: this.network
      });
      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, "base64");
        return import_algosdk3.default.decodeUnsignedTransaction(txnBytes);
      } else {
        throw new Error(response.data.error || "Failed to build remove liquidity transaction");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to remove liquidity");
    }
  }
  /**
   * Swap assets in pool
   */
  async swap(assetIn, amountIn, minAmountOut, senderAddress) {
    try {
      const response = await import_axios5.default.post(`${this.apiBaseUrl}/pools/${this.poolAppId}/swap`, {
        assetIn,
        amountIn,
        minAmountOut,
        sender: senderAddress,
        network: this.network
      });
      if (response.data.ok && response.data.txn) {
        const txnBytes = Buffer.from(response.data.txn, "base64");
        return import_algosdk3.default.decodeUnsignedTransaction(txnBytes);
      } else {
        throw new Error(response.data.error || "Failed to build swap transaction");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to swap");
    }
  }
  /**
   * Calculate price impact for a swap
   */
  async calculatePriceImpact(assetIn, amountIn) {
    try {
      const quote = await this.getSwapQuote(assetIn, amountIn);
      return quote.priceImpact;
    } catch (error) {
      throw this.handleError(error, "Failed to calculate price impact");
    }
  }
  /**
   * Get pool's current price ratio
   */
  async getPrice(assetIn) {
    try {
      const poolInfo = await this.getPoolInfo();
      if (assetIn === poolInfo.asset1) {
        return poolInfo.reserve2 / poolInfo.reserve1;
      } else if (assetIn === poolInfo.asset2) {
        return poolInfo.reserve1 / poolInfo.reserve2;
      } else {
        throw new Error("Asset not in pool");
      }
    } catch (error) {
      throw this.handleError(error, "Failed to get price");
    }
  }
  /**
   * Get pool's TVL (Total Value Locked)
   */
  async getTVL() {
    try {
      const poolInfo = await this.getPoolInfo();
      return poolInfo.totalLiquidity;
    } catch (error) {
      throw this.handleError(error, "Failed to get TVL");
    }
  }
  /**
   * Get the Algod client
   */
  getAlgodClient() {
    return this.algodClient;
  }
  /**
   * Get pool app ID
   */
  getPoolAppId() {
    return this.poolAppId;
  }
  handleError(error, message) {
    if (error.response) {
      return new Error(`${message}: ${error.response.data?.error || error.message}`);
    }
    return new Error(`${message}: ${error.message}`);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentWallet,
  AutoPilot,
  LiquidityPool,
  MarketAnalysis,
  SwapRouter
});
