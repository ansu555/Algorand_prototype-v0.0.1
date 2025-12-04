from algopy import (
    ARC4Contract,
    Asset,
    Bytes,
    Global,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    log,
    op,
    subroutine,
    Account,
    BoxMap
)

# Constants
PRECISION = 1_000_000_000_000  # Precision for rewards per share calculation

class UserStake(arc4.Struct):
    amount: arc4.UInt64
    reward_debt: arc4.UInt64

class StakingContract(ARC4Contract):
    """
    Flexible Staking Contract
    Users stake Asset A (X Token) to earn Asset B (XR Token).
    """

    def __init__(self) -> None:
        self.staked_asset_id = UInt64(0)
        self.reward_asset_id = UInt64(0)
        self.reward_rate = UInt64(0)  # Rewards per second
        self.last_update_time = UInt64(0)
        self.rewards_per_share = UInt64(0)
        self.total_staked = UInt64(0)
        self.admin = Global.creator_address
        
        # User storage: Address -> UserStake
        self.user_stakes = BoxMap(Account, UserStake)

    @arc4.abimethod
    def configure(self, staked_asset: Asset, reward_asset: Asset, reward_rate: UInt64) -> None:
        """Configure the staking contract. Only admin."""
        assert Txn.sender == self.admin, "Only admin"
        assert self.staked_asset_id == 0, "Already configured"
        
        self.staked_asset_id = staked_asset.id
        self.reward_asset_id = reward_asset.id
        self.reward_rate = reward_rate
        self.last_update_time = Global.latest_timestamp
        
        # Opt-in to assets
        itxn.AssetTransfer(
            xfer_asset=staked_asset,
            asset_receiver=Global.current_application_address,
            asset_amount=0
        ).submit()
        
        itxn.AssetTransfer(
            xfer_asset=reward_asset,
            asset_receiver=Global.current_application_address,
            asset_amount=0
        ).submit()

    @arc4.abimethod
    def set_reward_rate(self, new_rate: UInt64) -> None:
        """Update reward rate. Only admin."""
        assert Txn.sender == self.admin, "Only admin"
        self._update_pool()
        self.reward_rate = new_rate

    @subroutine
    def _update_pool(self) -> None:
        if Global.latest_timestamp <= self.last_update_time:
            return
        
        if self.total_staked == 0:
            self.last_update_time = Global.latest_timestamp
            return
        
        time_diff = Global.latest_timestamp - self.last_update_time
        reward_amt = time_diff * self.reward_rate
        
        # rewards_per_share += (reward_amt * PRECISION) / total_staked
        self.rewards_per_share += (reward_amt * UInt64(PRECISION)) // self.total_staked
        self.last_update_time = Global.latest_timestamp

    @arc4.abimethod
    def stake(self, txn: gtxn.AssetTransferTransaction) -> None:
        """Stake X Tokens."""
        self._update_pool()
        
        assert txn.xfer_asset.id == self.staked_asset_id, "Wrong asset"
        assert txn.asset_receiver == Global.current_application_address, "Wrong receiver"
        
        amount = txn.asset_amount
        sender = txn.sender
        
        # Get or create user stake
        current_stake = UserStake(amount=arc4.UInt64(0), reward_debt=arc4.UInt64(0))
        if sender in self.user_stakes:
            current_stake = self.user_stakes[sender].copy()
            
            # Distribute pending rewards if any
            pending = (current_stake.amount.native * self.rewards_per_share // UInt64(PRECISION)) - current_stake.reward_debt.native
            if pending > 0:
                itxn.AssetTransfer(
                    xfer_asset=self.reward_asset_id,
                    asset_receiver=sender,
                    asset_amount=pending
                ).submit()
        
        # Update user stake
        new_amount = current_stake.amount.native + amount
        new_debt = (new_amount * self.rewards_per_share) // UInt64(PRECISION)
        
        self.user_stakes[sender] = UserStake(
            amount=arc4.UInt64(new_amount),
            reward_debt=arc4.UInt64(new_debt)
        )
        
        self.total_staked += amount

    @arc4.abimethod
    def unstake(self, amount: UInt64) -> None:
        """Unstake X Tokens."""
        self._update_pool()
        
        sender = Txn.sender
        assert sender in self.user_stakes, "No stake found"
        
        current_stake = self.user_stakes[sender].copy()
        assert current_stake.amount.native >= amount, "Insufficient stake"
        
        # Calculate pending rewards
        pending = (current_stake.amount.native * self.rewards_per_share // UInt64(PRECISION)) - current_stake.reward_debt.native
        
        # Send rewards
        if pending > 0:
            itxn.AssetTransfer(
                xfer_asset=self.reward_asset_id,
                asset_receiver=sender,
                asset_amount=pending
            ).submit()
            
        # Send back staked tokens
        itxn.AssetTransfer(
            xfer_asset=self.staked_asset_id,
            asset_receiver=sender,
            asset_amount=amount
        ).submit()
        
        # Update user stake
        new_amount = current_stake.amount.native - amount
        new_debt = (new_amount * self.rewards_per_share) // UInt64(PRECISION)
        
        if new_amount == 0:
            del self.user_stakes[sender]
        else:
            self.user_stakes[sender] = UserStake(
                amount=arc4.UInt64(new_amount),
                reward_debt=arc4.UInt64(new_debt)
            )
            
        self.total_staked -= amount

    @arc4.abimethod
    def claim(self) -> None:
        """Claim pending rewards without unstaking."""
        self._update_pool()
        
        sender = Txn.sender
        assert sender in self.user_stakes, "No stake found"
        
        current_stake = self.user_stakes[sender].copy()
        
        pending = (current_stake.amount.native * self.rewards_per_share // UInt64(PRECISION)) - current_stake.reward_debt.native
        
        if pending > 0:
            itxn.AssetTransfer(
                xfer_asset=self.reward_asset_id,
                asset_receiver=sender,
                asset_amount=pending
            ).submit()
            
        # Update debt
        new_debt = (current_stake.amount.native * self.rewards_per_share) // UInt64(PRECISION)
        
        self.user_stakes[sender] = UserStake(
            amount=current_stake.amount,
            reward_debt=arc4.UInt64(new_debt)
        )

    @arc4.abimethod(readonly=True)
    def get_pending_rewards(self, user: Account) -> UInt64:
        """View pending rewards for a user."""
        if user not in self.user_stakes:
            return UInt64(0)
            
        current_stake = self.user_stakes[user].copy()
        
        # Calculate hypothetical new rewards_per_share
        acc_rewards_per_share = self.rewards_per_share
        if self.total_staked > 0 and Global.latest_timestamp > self.last_update_time:
            time_diff = Global.latest_timestamp - self.last_update_time
            reward_amt = time_diff * self.reward_rate
            acc_rewards_per_share += (reward_amt * UInt64(PRECISION)) // self.total_staked
            
        amount: UInt64 = current_stake.amount.native
        debt: UInt64 = current_stake.reward_debt.native
        total_reward: UInt64 = (amount * acc_rewards_per_share) // UInt64(PRECISION)
        
        return total_reward - debt
