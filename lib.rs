#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Map, Vec,
    contracterror,
};

#[contracterror]
#[derive(Debug)]  // Added Debug derivation for test assertions
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    InvalidThreshold = 2,
    NotSigner = 3,
    ProposalNotFound = 4,
    AlreadyApproved = 5,
    ProposalExecuted = 6,
    ThresholdNotMet = 7,
    NoSigners = 8,
    NotInitialized = 9,
}

#[contracttype]
pub enum DataKey {
    Signers,
    Threshold,
    Proposals,
    PropCount,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub to: Address,
    pub token: Address,
    pub amount: i128,
    pub approvers: Vec<Address>,
    pub executed: bool,
}

pub trait MultisigWalletTrait {
    fn initialize(env: Env, signers: Vec<Address>, threshold: u32) -> Result<(), Error>;
    fn propose(env: Env, from: Address, to: Address, token: Address, amount: i128) -> Result<u64, Error>;
    fn approve(env: Env, from: Address, proposal_id: u64) -> Result<(), Error>;
    fn execute(env: Env, from: Address, proposal_id: u64) -> Result<(), Error>;
    fn get_signers(env: Env) -> Result<Vec<Address>, Error>;
    fn get_threshold(env: Env) -> Result<u32, Error>;
    fn get_proposal(env: Env, id: u64) -> Result<Proposal, Error>;
}

#[contract]
pub struct MultisigWalletContract;

#[contractimpl]
impl MultisigWalletTrait for MultisigWalletContract {
    fn initialize(env: Env, signers: Vec<Address>, threshold: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Signers) {
            return Err(Error::AlreadyInitialized);
        }

        if threshold == 0 {
            return Err(Error::InvalidThreshold);
        }
        if signers.is_empty() {
            return Err(Error::NoSigners);
        }
        if threshold > signers.len() {
            return Err(Error::InvalidThreshold);
        }

        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage().instance().set(&DataKey::Threshold, &threshold);
        env.storage().instance().set(&DataKey::PropCount, &0u64);
        env.storage().instance().set(&DataKey::Proposals, &Map::<u64, Proposal>::new(&env));

        Ok(())
    }

    fn propose(
        env: Env,
        from: Address,
        to: Address,
        token: Address,
        amount: i128,
    ) -> Result<u64, Error> {
        from.require_auth();

        if !Self::is_signer(&env, &from)? {
            return Err(Error::NotSigner);
        }

        let mut prop_count: u64 = env
            .storage()
            .instance()
            .get::<DataKey, u64>(&DataKey::PropCount)
            .ok_or(Error::NotInitialized)?;
        prop_count += 1;

        let mut approvers = Vec::new(&env);
        approvers.push_back(from);

        let proposal = Proposal {
            to,
            token,
            amount,
            approvers,
            executed: false,
        };

        let mut proposals: Map<u64, Proposal> =
            env.storage()
                .instance()
                .get::<DataKey, Map<u64, Proposal>>(&DataKey::Proposals)
                .ok_or(Error::NotInitialized)?;
        proposals.set(prop_count, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);
        env.storage().instance().set(&DataKey::PropCount, &prop_count);

        Ok(prop_count)
    }

    fn approve(env: Env, from: Address, proposal_id: u64) -> Result<(), Error> {
        from.require_auth();

        if !Self::is_signer(&env, &from)? {
            return Err(Error::NotSigner);
        }

        let mut proposals: Map<u64, Proposal> =
            env.storage()
                .instance()
                .get::<DataKey, Map<u64, Proposal>>(&DataKey::Proposals)
                .ok_or(Error::NotInitialized)?;

        let mut proposal = proposals
            .get(proposal_id)
            .ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalExecuted);
        }

        if proposal.approvers.contains(&from) {
            return Err(Error::AlreadyApproved);
        }

        proposal.approvers.push_back(from);
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);

        Ok(())
    }

    fn execute(env: Env, from: Address, proposal_id: u64) -> Result<(), Error> {
        from.require_auth();

        if !Self::is_signer(&env, &from)? {
            return Err(Error::NotSigner);
        }

        let mut proposals: Map<u64, Proposal> =
            env.storage()
                .instance()
                .get::<DataKey, Map<u64, Proposal>>(&DataKey::Proposals)
                .ok_or(Error::NotInitialized)?;

        let mut proposal = proposals
            .get(proposal_id)
            .ok_or(Error::ProposalNotFound)?;

        if proposal.executed {
            return Err(Error::ProposalExecuted);
        }

        let threshold: u32 = env
            .storage()
            .instance()
            .get::<DataKey, u32>(&DataKey::Threshold)
            .ok_or(Error::NotInitialized)?;

        if proposal.approvers.len() < threshold {
            return Err(Error::ThresholdNotMet);
        }

        let token_client = token::Client::new(&env, &proposal.token);
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &proposal.to, &proposal.amount);

        proposal.executed = true;
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&DataKey::Proposals, &proposals);

        Ok(())
    }

    fn get_signers(env: Env) -> Result<Vec<Address>, Error> {
        env.storage()
            .instance()
            .get::<DataKey, Vec<Address>>(&DataKey::Signers)
            .ok_or(Error::NotInitialized)
    }

    fn get_threshold(env: Env) -> Result<u32, Error> {
        env.storage()
            .instance()
            .get::<DataKey, u32>(&DataKey::Threshold)
            .ok_or(Error::NotInitialized)
    }

    fn get_proposal(env: Env, id: u64) -> Result<Proposal, Error> {
        let proposals: Map<u64, Proposal> =
            env.storage()
                .instance()
                .get::<DataKey, Map<u64, Proposal>>(&DataKey::Proposals)
                .ok_or(Error::NotInitialized)?;
        
        proposals
            .get(id)
            .ok_or(Error::ProposalNotFound)
    }
}

impl MultisigWalletContract {
    fn is_signer(env: &Env, signer: &Address) -> Result<bool, Error> {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get::<DataKey, Vec<Address>>(&DataKey::Signers)
            .ok_or(Error::NotInitialized)?;
        Ok(signers.contains(signer))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, vec};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = Address::generate(&env);
        let client = MultisigWalletContractClient::new(&env, &contract_id);

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let mut signers = Vec::new(&env);
        signers.push_back(signer1.clone());
        signers.push_back(signer2.clone());

        let threshold = 2u32;

        client.initialize(&signers, &threshold);

        assert_eq!(client.get_signers(), signers);
        assert_eq!(client.get_threshold(), threshold);
    }

    #[test]
    fn test_initialize_already_initialized() {
        let env = Env::default();
        let contract_id = Address::generate(&env);
        let client = MultisigWalletContractClient::new(&env, &contract_id);

        let signers = vec![&env, Address::generate(&env)];
        let threshold = 1u32;

        client.initialize(&signers, &threshold);

        let result = client.try_initialize(&signers, &threshold);
        assert!(matches!(result, Err(Ok(Error::AlreadyInitialized))));
    }

    #[test]
    fn test_initialize_invalid_threshold() {
        let env = Env::default();
        let contract_id = Address::generate(&env);
        let client = MultisigWalletContractClient::new(&env, &contract_id);

        let signers = vec![&env, Address::generate(&env)];
        
        let result_zero = client.try_initialize(&signers, &0u32);
        assert!(matches!(result_zero, Err(Ok(Error::InvalidThreshold))));

        let result_too_high = client.try_initialize(&signers, &2u32);
        assert!(matches!(result_too_high, Err(Ok(Error::InvalidThreshold))));
    }
}