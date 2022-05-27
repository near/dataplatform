use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::Mutex;

use near_lake_framework::near_indexer_primitives::{IndexerTransactionWithOutcome, IndexerExecutionOutcomeWithReceipt,
views::ExecutionStatusView};

pub use rules::TxAlertRule;
pub(crate) use transactions::{TransactionDetails, TransactionCollectionStatus};

mod rules;
pub(crate) mod transactions;

pub(crate) type TransactionHashString = String;
pub(crate) type ReceiptIdString = String;
pub(crate) type GatheringTransactionDetails = HashMap<TransactionHashString, TransactionDetails>;
pub(crate) type WatchingReceiptsList = HashMap<ReceiptIdString, TransactionHashString>;
pub(crate) struct AlertexerMemoryData {
    pub gathering_transactions: GatheringTransactionDetails,
    pub watching_receipts_list: WatchingReceiptsList,
}

#[derive(Error, Debug)]
pub(crate) enum AlertexerMemoryDataError {
    #[error("Transaction is already being gathered")]
    TransactionExists,
}

impl AlertexerMemoryData {
    pub fn new() -> Self {
        Self {
            gathering_transactions: HashMap::<TransactionHashString, TransactionDetails>::new(),
            watching_receipts_list: HashMap::<ReceiptIdString, TransactionHashString>::new(),
        }
    }

    pub fn push_transaction(
        &mut self,
        transaction: IndexerTransactionWithOutcome,
    ) -> anyhow::Result<()> {
        if self
            .gathering_transactions
            .contains_key(&transaction.transaction.hash.to_string())
        {
            anyhow::bail!(AlertexerMemoryDataError::TransactionExists)
        } else {
            let converted_into_receipt_id = transaction
                    .outcome
                    .execution_outcome
                    .outcome
                    .receipt_ids
                    .first()
                    .expect("`receipt_ids` must contain one Receipt Id")
                    .to_string();
            let tx_details = TransactionDetails {
                transaction: transaction.transaction.clone(),
                receipts: vec![],
                execution_outcomes: vec![transaction.outcome.execution_outcome],
                collection_status: TransactionCollectionStatus::Collecting,
            };
            tracing::debug!(
                target: crate::INDEXER,
                "+R {}",
                &converted_into_receipt_id,
            );
            self.watching_receipts_list
            .insert(
                converted_into_receipt_id,
                transaction.transaction.hash.to_string()
            );
            self.gathering_transactions
                .insert(transaction.transaction.hash.to_string(), tx_details);
            tracing::debug!(
                target: crate::INDEXER,
                "TX added for gathering {}",
                &transaction.transaction.hash
            );
            Ok(())
        }
    }

    pub fn push_outcome_and_receipt(
        &mut self,
        transaction_hash: &TransactionHashString,
        indexer_execution_outcome_with_receipt: IndexerExecutionOutcomeWithReceipt,
    ) {
        if let Some(transaction_details) = self.gathering_transactions.get_mut(transaction_hash) {
            tracing::debug!(
                target: crate::INDEXER,
                "-R {}",
                &indexer_execution_outcome_with_receipt.receipt.receipt_id.to_string(),
            );
            let _ = self.watching_receipts_list.remove(&indexer_execution_outcome_with_receipt.receipt.receipt_id.to_string());
            transaction_details.receipts.push(indexer_execution_outcome_with_receipt.receipt);

            if matches!(indexer_execution_outcome_with_receipt.execution_outcome.outcome.status, ExecutionStatusView::SuccessValue(_)) {
                tracing::debug!(
                    target: crate::INDEXER,
                    "Finished TX {}",
                    &transaction_hash,
                );
                transaction_details.collection_status = TransactionCollectionStatus::Finished;
            }

            transaction_details.execution_outcomes.push(indexer_execution_outcome_with_receipt.execution_outcome);
        }
    }
}

pub(crate) type AlertexerMemory = Arc<Mutex<AlertexerMemoryData>>;
