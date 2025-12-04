export const STAKING_ABI = {
  name: "StakingContract",
  methods: [
    {
      name: "stake",
      args: [
        { type: "axfer", name: "txn" }
      ],
      returns: { type: "void" }
    },
    {
      name: "unstake",
      args: [
        { type: "uint64", name: "amount" }
      ],
      returns: { type: "void" }
    },
    {
      name: "claim",
      args: [],
      returns: { type: "void" }
    },
    {
      name: "get_pending_rewards",
      args: [
        { type: "account", name: "user" }
      ],
      returns: { type: "uint64" },
      readonly: true
    }
  ]
};
