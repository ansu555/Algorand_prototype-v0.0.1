"""
Integration tests for AutoPilot Rule Contract
"""

import pytest
from algokit_utils import (
    ApplicationClient,
    get_account,
)
from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import PaymentTxn, wait_for_confirmation
import algosdk


@pytest.fixture(scope="session")
def algod_client() -> AlgodClient:
    """Create Algod client for testnet"""
    return AlgodClient(
        "a" * 64,
        "https://testnet-api.algonode.cloud"
    )


@pytest.fixture(scope="session")
def creator_account(algod_client: AlgodClient):
    """Get creator account"""
    # In real tests, this would load from environment
    account = get_account(algod_client, "creator")
    
    # Fund account if needed
    account_info = algod_client.account_info(account.address)
    if account_info["amount"] < 10_000_000:
        print(f"Account {account.address} needs funding")
        print(f"Visit: https://bank.testnet.algorand.network/?account={account.address}")
    
    return account


@pytest.fixture(scope="session")
def user_account(algod_client: AlgodClient):
    """Get user account"""
    return get_account(algod_client, "user")


@pytest.fixture(scope="session")
def app_client(algod_client: AlgodClient, creator_account, app_spec):
    """Create and deploy AutoPilot Rule Contract"""
    client = ApplicationClient(
        algod_client=algod_client,
        app_spec=app_spec,
        signer=creator_account,
    )
    
    # Deploy
    client.create()
    
    # Fund contract
    params = algod_client.suggested_params()
    funding_txn = PaymentTxn(
        sender=creator_account.address,
        sp=params,
        receiver=client.app_address,
        amt=1_000_000,  # 1 ALGO
    )
    signed_txn = funding_txn.sign(creator_account.private_key)
    txid = algod_client.send_transaction(signed_txn)
    wait_for_confirmation(algod_client, txid, 4)
    
    return client


def test_contract_deployment(app_client: ApplicationClient):
    """Test that contract deploys successfully"""
    assert app_client.app_id > 0
    assert app_client.app_address is not None
    
    # Get contract stats
    result = app_client.call("get_contract_stats")
    stats = result.return_value
    
    assert stats[0] == 0  # rule_counter
    assert stats[1] == 0  # total_executions
    assert stats[2] == 10  # protocol_fee_bps


def test_create_dca_rule(app_client: ApplicationClient, user_account, algod_client: AlgodClient):
    """Test creating a DCA rule"""
    params = algod_client.suggested_params()
    
    # Create payment for box storage
    payment_txn = PaymentTxn(
        sender=user_account.address,
        sp=params,
        receiver=app_client.app_address,
        amt=165_000,  # 0.165 ALGO
    )
    
    # Create rule
    result = app_client.call(
        "create_rule",
        sender=user_account,
        args={
            "rule_type": 1,  # DCA
            "target_assets": [10458941],  # USDC testnet
            "rotate_top_n": 0,
            "max_spend_microalgos": 1_000_000,  # 1 ALGO
            "max_slippage_bps": 50,  # 0.5%
            "cooldown_minutes": 60,  # 1 hour
            "trigger_type": 1,  # price_drop
            "threshold_bps": 500,  # 5%
            "window_hours": 0,
            "payment": payment_txn,
        }
    )
    
    rule_id = result.return_value
    assert rule_id == 1
    
    # Verify rule was created
    rule_data = app_client.call(
        "get_rule",
        args={
            "rule_id": rule_id,
            "owner": user_account.address,
        }
    ).return_value
    
    assert rule_data.rule_id == rule_id
    assert rule_data.owner == user_account.address
    assert rule_data.rule_type == 1  # DCA
    assert rule_data.status == 1  # ACTIVE


def test_create_rebalance_rule(app_client: ApplicationClient, user_account, algod_client: AlgodClient):
    """Test creating a REBALANCE rule"""
    params = algod_client.suggested_params()
    
    payment_txn = PaymentTxn(
        sender=user_account.address,
        sp=params,
        receiver=app_client.app_address,
        amt=165_000,
    )
    
    result = app_client.call(
        "create_rule",
        sender=user_account,
        args={
            "rule_type": 2,  # REBALANCE
            "target_assets": [10458941, 0],  # USDC and ALGO
            "rotate_top_n": 0,
            "max_spend_microalgos": 5_000_000,  # 5 ALGO
            "max_slippage_bps": 100,  # 1%
            "cooldown_minutes": 1440,  # 24 hours
            "trigger_type": 2,  # trend
            "threshold_bps": 500,  # 5%
            "window_hours": 168,  # 7 days
            "payment": payment_txn,
        }
    )
    
    rule_id = result.return_value
    assert rule_id == 2


def test_pause_and_resume_rule(app_client: ApplicationClient, user_account):
    """Test pausing and resuming a rule"""
    rule_id = 1
    
    # Pause rule
    app_client.call(
        "update_rule_status",
        sender=user_account,
        args={
            "rule_id": rule_id,
            "new_status": 2,  # PAUSED
        }
    )
    
    # Verify paused
    rule_data = app_client.call(
        "get_rule",
        args={
            "rule_id": rule_id,
            "owner": user_account.address,
        }
    ).return_value
    
    assert rule_data.status == 2  # PAUSED
    
    # Resume rule
    app_client.call(
        "update_rule_status",
        sender=user_account,
        args={
            "rule_id": rule_id,
            "new_status": 1,  # ACTIVE
        }
    )
    
    # Verify active
    rule_data = app_client.call(
        "get_rule",
        args={
            "rule_id": rule_id,
            "owner": user_account.address,
        }
    ).return_value
    
    assert rule_data.status == 1  # ACTIVE


def test_update_rule_parameters(app_client: ApplicationClient, user_account):
    """Test updating rule parameters"""
    rule_id = 1
    
    # Update parameters
    app_client.call(
        "update_rule_parameters",
        sender=user_account,
        args={
            "rule_id": rule_id,
            "max_spend_microalgos": 2_000_000,  # 2 ALGO
            "max_slippage_bps": 75,  # 0.75%
            "cooldown_minutes": 120,  # 2 hours
        }
    )
    
    # Verify updated
    rule_data = app_client.call(
        "get_rule",
        args={
            "rule_id": rule_id,
            "owner": user_account.address,
        }
    ).return_value
    
    assert rule_data.max_spend_microalgos == 2_000_000
    assert rule_data.max_slippage_bps == 75
    assert rule_data.cooldown_minutes == 120


def test_unauthorized_access_fails(app_client: ApplicationClient, user_account, creator_account):
    """Test that unauthorized users cannot modify rules"""
    rule_id = 1
    
    # Try to modify another user's rule
    with pytest.raises(Exception) as exc_info:
        app_client.call(
            "update_rule_status",
            sender=creator_account,  # Different user
            args={
                "rule_id": rule_id,
                "new_status": 2,  # PAUSED
            }
        )
    
    assert "Not rule owner" in str(exc_info.value)


def test_delete_rule(app_client: ApplicationClient, user_account):
    """Test deleting a rule and reclaiming MBR"""
    # Get user balance before
    algod_client = app_client._algod_client
    balance_before = algod_client.account_info(user_account.address)["amount"]
    
    rule_id = 2
    
    # Delete rule
    app_client.call(
        "delete_rule",
        sender=user_account,
        args={
            "rule_id": rule_id,
        }
    )
    
    # Verify rule is deleted
    with pytest.raises(Exception) as exc_info:
        app_client.call(
            "get_rule",
            args={
                "rule_id": rule_id,
                "owner": user_account.address,
            }
        )
    
    assert "Rule not found" in str(exc_info.value)
    
    # Verify MBR was returned
    balance_after = algod_client.account_info(user_account.address)["amount"]
    # Should get back most of the box storage cost (minus fees)
    assert balance_after > balance_before


def test_get_rule_stats(app_client: ApplicationClient, user_account):
    """Test getting rule statistics"""
    rule_id = 1
    
    result = app_client.call(
        "get_rule_stats",
        args={
            "rule_id": rule_id,
            "owner": user_account.address,
        }
    )
    
    stats = result.return_value
    total_executions = stats[0]
    total_spent = stats[1]
    last_execution = stats[2]
    
    assert total_executions == 0  # Not executed yet
    assert total_spent == 0
    assert last_execution == 0


def test_emergency_pause(app_client: ApplicationClient, creator_account, user_account, algod_client: AlgodClient):
    """Test emergency pause functionality"""
    # Pause contract (admin only)
    app_client.call(
        "set_pause",
        sender=creator_account,
        args={
            "paused": True,
        }
    )
    
    # Try to create rule while paused
    params = algod_client.suggested_params()
    payment_txn = PaymentTxn(
        sender=user_account.address,
        sp=params,
        receiver=app_client.app_address,
        amt=165_000,
    )
    
    with pytest.raises(Exception) as exc_info:
        app_client.call(
            "create_rule",
            sender=user_account,
            args={
                "rule_type": 1,
                "target_assets": [10458941],
                "rotate_top_n": 0,
                "max_spend_microalgos": 1_000_000,
                "max_slippage_bps": 50,
                "cooldown_minutes": 60,
                "trigger_type": 1,
                "threshold_bps": 500,
                "window_hours": 0,
                "payment": payment_txn,
            }
        )
    
    assert "Contract is paused" in str(exc_info.value)
    
    # Unpause
    app_client.call(
        "set_pause",
        sender=creator_account,
        args={
            "paused": False,
        }
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
