use std::collections::HashMap;

// Find all our documentation at https://docs.near.org
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::store::UnorderedMap;
use near_sdk::{env, log, near_bindgen, AccountId, BorshStorageKey, CryptoHash};

type FunctionName = String;
// Define the contract structure
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Contract {
    registry: IndexersByAccount,
    account_roles: Vec<AccountRole>,
}

pub type IndexersByAccount = UnorderedMap<AccountId, IndexerConfigByFunctionName>;

pub type IndexerConfigByFunctionName = UnorderedMap<FunctionName, IndexerConfig>;

/// Enum to allow for returning either a single account's indexers or all indexers
/// This type uses `HashMap` rather than `UnorderedMap` as we need to load the
/// data into memory to return it.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(crate = "near_sdk::serde")]
pub enum AccountOrAllIndexers {
    All(HashMap<AccountId, HashMap<FunctionName, IndexerConfig>>),
    Account(HashMap<FunctionName, IndexerConfig>),
}

impl From<&IndexersByAccount> for AccountOrAllIndexers {
    fn from(indexers_by_account: &IndexersByAccount) -> Self {
        AccountOrAllIndexers::All(
            indexers_by_account
                .iter()
                .map(|(account_id, account_indexers)| {
                    (
                        account_id.clone(),
                        account_indexers
                            .iter()
                            .map(|(function_name, config)| (function_name.clone(), config.clone()))
                            .collect(),
                    )
                })
                .collect(),
        )
    }
}

impl From<&IndexerConfigByFunctionName> for AccountOrAllIndexers {
    fn from(indexer_config_by_function_name: &IndexerConfigByFunctionName) -> Self {
        AccountOrAllIndexers::Account(
            indexer_config_by_function_name
                .iter()
                .map(|(function_name, config)| (function_name.clone(), config.clone()))
                .collect(),
        )
    }
}

#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKeys {
    Registry,
    Account(CryptoHash),
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct OldState {
    registry: HashMap<FunctionName, IndexerConfig>,
}

// Define the contract structure
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(crate = "near_sdk::serde")]
pub struct IndexerConfig {
    code: String,
    start_block_height: Option<u64>,
    schema: Option<String>,
}

/// These roles are used to control access across the various contract methods.
///
/// Owners
/// Owners are defined within the contract default state, and can only be modified via
/// a contract upgrade. The inention is for Owners to be able to execute any action.
///
/// Moderator
/// Moderators can only be invited, and also removed, by Owners. The intention behind this role
/// is for allowing addition/removal of any accounts functions.
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(crate = "near_sdk::serde")]
pub enum Role {
    Owner,
    User,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(crate = "near_sdk::serde")]
pub struct AccountRole {
    account_id: AccountId,
    role: Role,
}

// Define the default, which automatically initializes the contract
impl Default for Contract {
    fn default() -> Self {
        Self {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![
                AccountRole {
                    account_id: AccountId::new_unchecked("morgs.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("pavelnear.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("roshaan.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("flatirons.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("root.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("khorolets.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: env::current_account_id(),
                    role: Role::Owner,
                },
            ],
        }
    }
}

// Implement the contract structure
#[near_bindgen]
impl Contract {
    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let state: OldState = env::state_read().unwrap_or_else(|| {
            env::panic_str("Failed to deserialize contract state");
        });

        let mut registry = IndexersByAccount::new(StorageKeys::Registry);

        state.registry.iter().for_each(|(name, config)| {
            let (account_id, function_name) = match name.split_once('/') {
                Some((account_id, function_name)) => {
                    let account_id = account_id.parse::<AccountId>().unwrap_or_else(|_| {
                        env::panic_str(&format!(
                            "Parsed account ID {} from function {} is invalid",
                            account_id, name
                        ));
                    });

                    (account_id, function_name)
                }
                None => {
                    env::panic_str(&format!("Invalid function name {}", name));
                }
            };

            registry
                .entry(account_id.clone())
                .or_insert(IndexerConfigByFunctionName::new(StorageKeys::Account(
                    env::sha256_array(account_id.as_bytes()),
                )))
                .insert(function_name.to_string(), config.clone());
        });

        Self {
            registry,
            account_roles: Self::default().account_roles,
        }
    }

    // Public method - returns a function previously registered under this name or empty string
    pub fn read_indexer_function(
        &self,
        function_name: String,
        account_id: Option<String>,
    ) -> IndexerConfig {
        let account_id = match account_id {
            Some(account_id) => account_id.parse::<AccountId>().unwrap_or_else(|_| {
                env::panic_str(&format!("Account ID {} is invalid", account_id));
            }),
            None => env::signer_account_id(),
        };

        let account_indexers = self.registry.get(&account_id).unwrap_or_else(|| {
            env::panic_str(format!("Account {} has no registered functions", account_id).as_str())
        });

        let indexer_config = account_indexers.get(&function_name).unwrap_or_else(|| {
            env::panic_str(
                format!(
                    "Function {} is not registered under account {}",
                    &function_name, account_id
                )
                .as_str(),
            )
        });

        indexer_config.clone()
    }

    pub fn assert_roles(&self, permitted_roles: Vec<Role>) {
        let account_id = env::signer_account_id();
        let account = self
            .account_roles
            .iter()
            .find(|admin| admin.account_id == account_id);

        match account {
            Some(admin) => {
                if permitted_roles.iter().any(|role| *role == admin.role) {
                    return;
                }
                env::panic_str(&format!(
                    "Account {} does not have one of required roles {:?}",
                    admin.account_id, permitted_roles
                ));
            }
            None => {
                env::panic_str(&format!("Account {} does not have any roles", account_id,));
            }
        }
    }

    pub fn list_account_roles(&self) -> Vec<AccountRole> {
        self.account_roles.clone()
    }

    pub fn remove_user(&mut self, account_id: String) {
        self.assert_roles(vec![Role::Owner]);

        let account_id = account_id.parse::<AccountId>().unwrap_or_else(|_| {
            env::panic_str(&format!("Account ID {} is invalid", account_id));
        });

        let account = self
            .account_roles
            .iter()
            .find(|account| account.account_id == account_id);

        match account {
            Some(admin) => {
                if !matches!(admin.role, Role::Owner) {
                    self.account_roles
                        .retain(|account| account.account_id != account_id);
                } else {
                    env::panic_str(&format!("Cannot remove owner account {}", account_id));
                }
            }
            None => {
                env::panic_str(&format!("Account {} does not exist", account_id));
            }
        }
    }

    pub fn add_user(&mut self, account_id: String) {
        self.assert_roles(vec![Role::Owner]);

        let account_id = account_id.parse::<AccountId>().unwrap_or_else(|_| {
            env::panic_str(&format!("Account ID {} is invalid", account_id));
        });

        if self
            .account_roles
            .iter()
            .any(|account| account.account_id == account_id)
        {
            env::panic_str(&format!("Account {} already exists", account_id));
        }

        self.account_roles.push(AccountRole {
            account_id,
            role: Role::User,
        })
    }

    // Public method - registers indexer code under <account_id> then function_name
    pub fn register_indexer_function(
        &mut self,
        function_name: String,
        code: String,
        start_block_height: Option<u64>,
        schema: Option<String>,
        account_id: Option<String>,
    ) {
        let account_id = match account_id {
            Some(account_id) => {
                self.assert_roles(vec![Role::Owner]);

                account_id.parse::<AccountId>().unwrap_or_else(|_| {
                    env::panic_str(&format!("Account ID {} is invalid", account_id));
                })
            }
            None => {
                self.assert_roles(vec![Role::Owner, Role::User]);
                env::signer_account_id()
            }
        };

        log!(
            "Registering function {} for account {}",
            &function_name,
            &account_id
        );

        self.registry
            .entry(account_id.clone())
            .or_insert(IndexerConfigByFunctionName::new(StorageKeys::Account(
                env::sha256_array(account_id.as_bytes()),
            )))
            .insert(
                function_name,
                IndexerConfig {
                    code,
                    start_block_height,
                    schema,
                },
            );
    }

    pub fn remove_indexer_function(&mut self, function_name: String, account_id: Option<String>) {
        let account_id = match account_id {
            Some(account_id) => {
                self.assert_roles(vec![Role::Owner]);

                account_id.parse::<AccountId>().unwrap_or_else(|_| {
                    env::panic_str(&format!("Account ID {} is invalid", account_id));
                })
            }
            None => {
                self.assert_roles(vec![Role::Owner, Role::User]);
                env::signer_account_id()
            }
        };

        log!(
            "Removing function {} under account {}",
            &function_name,
            &account_id,
        );

        let user_functions = self.registry.get_mut(&account_id).unwrap_or_else(|| {
            env::panic_str(format!("Account {} does not have any functions", account_id).as_str())
        });

        user_functions.remove(&function_name).unwrap_or_else(|| {
            env::panic_str(
                format!(
                    "Function {} does not exist on account {}",
                    &function_name, account_id
                )
                .as_str(),
            )
        });

        if user_functions.is_empty() {
            self.registry.remove(&account_id);
        }
    }

    pub fn list_indexer_functions(&self, account_id: Option<String>) -> AccountOrAllIndexers {
        match account_id {
            Some(account_id) => {
                let account_id = account_id.parse::<AccountId>().unwrap_or_else(|_| {
                    env::panic_str(&format!("Account ID {} is invalid", account_id));
                });

                let account_indexers = self.registry.get(&account_id).unwrap_or_else(|| {
                    env::panic_str(
                        format!("Account {} has no registered functions", account_id).as_str(),
                    )
                });

                AccountOrAllIndexers::from(account_indexers)
            }
            None => AccountOrAllIndexers::from(&self.registry),
        }
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrate() {
        env::state_write(&OldState {
            registry: HashMap::from([
                (
                    "morgs.near/test".to_string(),
                    IndexerConfig {
                        code: "return block;".to_string(),
                        start_block_height: None,
                        schema: None,
                    },
                ),
                (
                    "morgs.near/test2".to_string(),
                    IndexerConfig {
                        code: "return block2;".to_string(),
                        start_block_height: None,
                        schema: None,
                    },
                ),
                (
                    "root.near/my_function".to_string(),
                    IndexerConfig {
                        code: "var x = 1;".to_string(),
                        start_block_height: Some(1),
                        schema: None,
                    },
                ),
                (
                    "roshaan.near/another/function".to_string(),
                    IndexerConfig {
                        code: "console.log('hi');".to_string(),
                        start_block_height: None,
                        schema: Some("schema".to_string()),
                    },
                ),
            ]),
        });

        let contract = Contract::migrate();

        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("morgs.near".to_string()))
                .unwrap()
                .len(),
            2
        );
        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("root.near".to_string()))
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("roshaan.near".to_string()))
                .unwrap()
                .len(),
            1
        );

        assert_eq!(contract.account_roles.len(), 7);
    }

    #[test]
    fn list_account_roles() {
        let admins = vec![
            AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            },
            AccountRole {
                account_id: AccountId::new_unchecked("flatirons.near".to_string()),
                role: Role::User,
            },
        ];
        let contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: admins.clone(),
        };
        assert_eq!(contract.list_account_roles(), admins);
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have one of required roles [Owner]")]
    fn users_cant_add_other_users() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };
        contract.add_user("alice.near".to_string());
    }

    #[test]
    #[should_panic(expected = "Account bob.near already exists")]
    fn cannot_add_existing_user() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.add_user("bob.near".to_string());
    }

    #[test]
    fn add_user() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.add_user("alice.near".to_string());

        assert!(contract
            .account_roles
            .iter()
            .any(|account| account.account_id.to_string() == "alice.near"))
    }

    #[test]
    #[should_panic(expected = "Account ID 0 is invalid")]
    fn add_user_with_invalid_account_id() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.add_user("0".to_string());
    }

    #[test]
    #[should_panic(expected = "Cannot remove owner account alice.near")]
    fn cannot_remove_owners() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![
                AccountRole {
                    account_id: AccountId::new_unchecked("bob.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("alice.near".to_string()),
                    role: Role::Owner,
                },
            ],
        };

        contract.remove_user("alice.near".to_string());
    }

    #[test]
    #[should_panic(expected = "Account alice.near does not exist")]
    fn cannot_remove_non_existing_user() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.remove_user("alice.near".to_string());
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have one of required roles [Owner]")]
    fn users_cant_remove_other_users() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![
                AccountRole {
                    account_id: AccountId::new_unchecked("bob.near".to_string()),
                    role: Role::User,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("alice.near".to_string()),
                    role: Role::User,
                },
            ],
        };

        contract.remove_user("alice.near".to_string());
    }

    #[test]
    fn remove_user() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![
                AccountRole {
                    account_id: AccountId::new_unchecked("bob.near".to_string()),
                    role: Role::Owner,
                },
                AccountRole {
                    account_id: AccountId::new_unchecked("alice.near".to_string()),
                    role: Role::User,
                },
            ],
        };

        contract.remove_user("alice.near".to_string());

        assert!(!contract
            .account_roles
            .iter()
            .any(|account| account.account_id.to_string() == "alice.near"))
    }

    #[test]
    #[should_panic(expected = "Account ID 0 is invalid")]
    fn remove_user_with_invalid_account_id() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.remove_user("0".to_string());
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have any roles")]
    fn assert_roles_should_panic_when_account_doesnt_exist() {
        let contract = Contract::default();
        contract.assert_roles(vec![])
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have one of required roles [Owner]")]
    fn assert_roles_should_panic_when_account_doesnt_have_role() {
        let contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };
        contract.assert_roles(vec![Role::Owner])
    }

    #[test]
    fn assert_roles_should_allow_account_with_required_role() {
        let contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };
        contract.assert_roles(vec![Role::Owner])
    }

    #[test]
    fn users_can_register_functions_for_themselves() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: Some(43434343),
            schema: None,
        };

        contract.register_indexer_function(
            "test".to_string(),
            config.code.clone(),
            config.start_block_height,
            config.schema.clone(),
            None,
        );

        assert_eq!(
            contract.read_indexer_function("test".to_string(), None),
            config
        );
    }

    #[test]
    fn owners_can_register_functions_for_themselves() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: Some(43434343),
            schema: None,
        };
        contract.register_indexer_function(
            "test".to_string(),
            config.code.clone(),
            config.start_block_height,
            config.schema.clone(),
            None,
        );
        assert_eq!(
            contract.read_indexer_function("test".to_string(), None),
            config
        );
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have any roles")]
    fn anonymous_cannot_register_functions_for_themselves() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![],
        };

        contract.register_indexer_function(
            "test".to_string(),
            "var x= 1;".to_string(),
            Some(43434343),
            None,
            None,
        );
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have any roles")]
    fn anonymous_cannot_register_functions_for_others() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![],
        };

        contract.register_indexer_function(
            "test".to_string(),
            "var x= 1;".to_string(),
            Some(43434343),
            None,
            Some("alice.near".to_string()),
        );
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have one of required roles [Owner]")]
    fn users_can_not_register_functions_for_others() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };

        contract.register_indexer_function(
            "test".to_string(),
            "var x = 1;".to_string(),
            Some(434343),
            None,
            Some("alice.near".to_string()),
        );
    }

    #[test]
    fn owners_can_register_functions_for_others() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.register_indexer_function(
            "test".to_string(),
            "var x = 1;".to_string(),
            Some(434343),
            None,
            Some("alice.near".to_string()),
        );

        assert!(contract
            .registry
            .get(&AccountId::new_unchecked("alice.near".to_string()))
            .unwrap()
            .get("test")
            .is_some());
    }

    #[test]
    fn register_indexer_function_for_new_account() {
        let mut contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: None,
            schema: None,
        };

        contract.register_indexer_function(
            "test".to_string(),
            config.code.clone(),
            config.start_block_height,
            config.schema.clone(),
            None,
        );

        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("bob.near".to_string()))
                .unwrap()
                .get("test")
                .unwrap(),
            &config
        );
    }

    #[test]
    fn register_indexer_function_for_existing_account() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: None,
            schema: None,
        };

        contract.register_indexer_function(
            "test2".to_string(),
            config.code.clone(),
            config.start_block_height,
            config.schema,
            None,
        );

        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("bob.near".to_string()))
                .unwrap()
                .len(),
            2
        );
    }

    #[test]
    fn users_can_remove_their_own_functions() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };

        contract.remove_indexer_function("test".to_string(), None);

        assert!(contract
            .registry
            .get(&AccountId::new_unchecked("bob.near".to_string()))
            .is_none());
    }

    #[test]
    fn owners_can_remove_their_own_functions() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.remove_indexer_function("test".to_string(), None);

        assert!(contract
            .registry
            .get(&AccountId::new_unchecked("bob.near".to_string()))
            .is_none());
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have one of required roles [Owner]")]
    fn users_cannot_remove_functions_for_others() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };

        contract.remove_indexer_function("test".to_string(), Some("alice.near".to_string()));
    }

    #[test]
    fn owners_can_remove_functions_for_others() {
        let account_id = AccountId::new_unchecked("alice.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::Owner,
            }],
        };

        contract.remove_indexer_function("test".to_string(), Some("alice.near".to_string()));

        assert!(contract
            .registry
            .get(&AccountId::new_unchecked("alice.near".to_string()))
            .is_none());
    }

    #[test]
    #[should_panic(expected = "Account bob.near does not have any roles")]
    fn anonymous_cannot_remove_functions() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![],
        };

        contract.remove_indexer_function("test".to_string(), None);
    }

    #[test]
    fn remove_one_of_many_indexer_functions_from_account() {
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert(
            "test".to_string(),
            IndexerConfig {
                code: "var x= 1;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        account_indexers.insert(
            "test2".to_string(),
            IndexerConfig {
                code: "var x= 2;".to_string(),
                start_block_height: Some(43434343),
                schema: None,
            },
        );
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let mut contract = Contract {
            registry,
            account_roles: vec![AccountRole {
                account_id: AccountId::new_unchecked("bob.near".to_string()),
                role: Role::User,
            }],
        };

        contract.remove_indexer_function("test".to_string(), None);

        assert_eq!(
            contract
                .registry
                .get(&AccountId::new_unchecked("bob.near".to_string()))
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    #[should_panic(expected = "Function test is not registered under account bob.near")]
    fn read_non_existant_indexer_function() {
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        contract.read_indexer_function("test".to_string(), None);
    }

    #[test]
    fn read_indexer_function() {
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: None,
            schema: None,
        };
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert("test".to_string(), config.clone());
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        assert_eq!(
            contract.read_indexer_function("test".to_string(), None),
            config
        );
    }

    #[test]
    fn read_indexer_function_from_other_account() {
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: None,
            schema: None,
        };
        let account_id = AccountId::new_unchecked("alice.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert("test".to_string(), config.clone());
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        assert_eq!(
            contract.read_indexer_function("test".to_string(), Some("alice.near".to_string())),
            config
        );
    }

    #[test]
    #[should_panic(expected = "Account bob.near has no registered functions")]
    fn read_indexer_function_for_non_existant_account() {
        let contract = Contract::default();
        // no registered indexers so should return the default ""
        contract.read_indexer_function("test".to_string(), None);
    }

    #[test]
    fn list_indexer_functions() {
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: Some(43434343),
            schema: None,
        };
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert("test".to_string(), config.clone());
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        assert_eq!(
            contract.list_indexer_functions(None),
            AccountOrAllIndexers::All(HashMap::from([(
                AccountId::new_unchecked("bob.near".to_string()),
                HashMap::from([("test".to_string(), config)])
            )]))
        );
    }

    #[test]
    fn list_account_indexer_functions() {
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: Some(43434343),
            schema: None,
        };
        let account_id = AccountId::new_unchecked("bob.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert("test".to_string(), config.clone());
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        assert_eq!(
            contract.list_indexer_functions(Some("bob.near".to_string())),
            AccountOrAllIndexers::Account(HashMap::from([("test".to_string(), config)]))
        );
    }

    #[test]
    #[should_panic(expected = "Account bob.near has no registered functions")]
    fn list_account_empty_indexer_functions() {
        let contract = Contract {
            registry: IndexersByAccount::new(StorageKeys::Registry),
            account_roles: vec![],
        };

        contract.list_indexer_functions(Some("bob.near".to_string()));
    }

    #[test]
    fn list_other_account_indexer_functions() {
        let config = IndexerConfig {
            code: "var x= 1;".to_string(),
            start_block_height: Some(43434343),
            schema: None,
        };
        let account_id = AccountId::new_unchecked("alice.near".to_string());
        let mut account_indexers = IndexerConfigByFunctionName::new(StorageKeys::Account(
            env::sha256_array(account_id.as_bytes()),
        ));
        account_indexers.insert("test".to_string(), config.clone());
        let mut registry = IndexersByAccount::new(StorageKeys::Registry);
        registry.insert(account_id, account_indexers);
        let contract = Contract {
            registry,
            account_roles: vec![],
        };

        assert_eq!(
            contract.list_indexer_functions(Some("alice.near".to_string())),
            AccountOrAllIndexers::Account(HashMap::from([("test".to_string(), config)]))
        );
    }
}
