use anyhow::Context;
use chrono::{DateTime, NaiveDate, Utc};
use futures::future::try_join_all;

const MAX_S3_LIST_REQUESTS: usize = 1000;
pub const DELTA_LAKE_BUCKET: &str = "near-delta-lake";
pub const LATEST_BLOCK_METADATA_KEY: &str =
    "silver/accounts/action_receipt_actions/metadata/latest_block.json";

#[derive(serde::Deserialize, Debug, Eq, PartialEq)]
pub struct LatestBlockMetadata {
    pub last_indexed_block: String,
    pub first_indexed_block: String,
    pub last_indexed_block_date: String,
    pub first_indexed_block_date: String,
    pub processed_at_utc: String,
}

pub struct DeltaLakeClient<T>
where
    T: crate::s3_client::S3ClientTrait,
{
    s3_client: T,
}

impl<T> DeltaLakeClient<T>
where
    T: crate::s3_client::S3ClientTrait,
{
    pub fn new(s3_client: T) -> Self {
        DeltaLakeClient { s3_client }
    }

    pub async fn get_latest_block_metadata(&self) -> anyhow::Result<LatestBlockMetadata> {
        let metadata_file_content = self
            .s3_client
            .get_text_file(DELTA_LAKE_BUCKET, LATEST_BLOCK_METADATA_KEY)
            .await?;

        serde_json::from_str::<LatestBlockMetadata>(&metadata_file_content)
            .context("Unable to parse Metadata")
    }

    async fn list_s3_bucket_by_prefix(
        &self,
        s3_bucket: &str,
        s3_prefix: &str,
    ) -> anyhow::Result<Vec<String>> {
        let mut results = vec![];
        let mut continuation_token: Option<String> = None;

        let mut counter = 0;
        loop {
            let file_list = match continuation_token {
                Some(token) => self
                    .s3_client
                    .list_objects(s3_bucket, s3_prefix, Some(token)),
                None => self.s3_client.list_objects(s3_bucket, s3_prefix, None),
            }
            .await?;

            if let Some(common_prefixes) = file_list.common_prefixes {
                let keys: Vec<String> = common_prefixes
                    .into_iter()
                    .map(|o| o.prefix.unwrap())
                    .collect();
                results.extend(keys);
            }
            if let Some(objects) = file_list.contents {
                let keys: Vec<String> = objects.into_iter().map(|o| o.key.unwrap()).collect();
                results.extend(keys);
            }
            if file_list.next_continuation_token.is_some() {
                continuation_token = file_list.next_continuation_token;
                counter += 1;
                if counter > MAX_S3_LIST_REQUESTS {
                    anyhow::bail!("Exceeded internal limit of {MAX_S3_LIST_REQUESTS}")
                }
            } else {
                break;
            }
        }
        Ok(results)
    }

    fn storage_path_for_account(&self, account: &str) -> String {
        let mut folders = account.split('.').collect::<Vec<&str>>();
        folders.reverse();
        folders.join("/")
    }

    async fn list_index_files_by_wildcard(
        &self,
        s3_bucket: &str,
        s3_folder: &str,
        pattern: &&str,
    ) -> anyhow::Result<Vec<String>> {
        // remove sub-account wildcard from pattern
        let pattern = pattern.replace("*.", "");
        let path = self.storage_path_for_account(&pattern);

        let folders = self
            .list_s3_bucket_by_prefix(s3_bucket, &format!("{}/{}/", s3_folder, path))
            .await?;
        // for each matching folder list files
        let mut results = vec![];
        for folder in folders {
            results.extend(self.list_s3_bucket_by_prefix(s3_bucket, &folder).await?);
        }
        Ok(results)
    }

    pub async fn find_index_files_by_pattern(
        &self,
        s3_bucket: &str,
        s3_folder: &str,
        pattern: &str,
    ) -> anyhow::Result<Vec<String>> {
        Ok(match pattern {
            x if x.contains(',') => {
                let account_array = x.split(',');
                let mut results = vec![];
                for account in account_array {
                    let account = account.trim();
                    let sub_results = if account.contains('*') {
                        self.list_index_files_by_wildcard(s3_bucket, s3_folder, &account)
                            .await?
                    } else {
                        self.list_s3_bucket_by_prefix(
                            s3_bucket,
                            &format!("{}/{}/", s3_folder, self.storage_path_for_account(account)),
                        )
                        .await?
                    };
                    results.extend(sub_results);
                }
                results
            }
            x if x.contains('*') => {
                self.list_index_files_by_wildcard(s3_bucket, s3_folder, &x)
                    .await?
            }
            _ => {
                self.list_s3_bucket_by_prefix(
                    s3_bucket,
                    &format!("{}/{}/", s3_folder, self.storage_path_for_account(pattern),),
                )
                .await?
            }
        })
    }

    fn file_name_date_after(&self, start_date: DateTime<Utc>, file_name: &str) -> bool {
        let file_name_date = file_name.split('/').last().unwrap().replace(".json", "");
        let file_name_date = NaiveDate::parse_from_str(&file_name_date, "%Y-%m-%d");
        match file_name_date {
            Ok(file_name_date) => file_name_date >= start_date.date_naive(),
            Err(e) => {
                // if we can't parse the date assume a file this code is not meant to handle
                tracing::debug!(
                    target: crate::LOG_TARGET,
                    "Error parsing file name date: {:?}",
                    e
                );
                false
            }
        }
    }

    pub async fn fetch_contract_index_files(
        &self,
        s3_bucket: &str,
        s3_folder: &str,
        start_date: DateTime<Utc>,
        contract_pattern: &str,
    ) -> anyhow::Result<Vec<String>> {
        // list all index files
        let file_list = self
            .find_index_files_by_pattern(s3_bucket, s3_folder, contract_pattern)
            .await?;

        let fetch_and_parse_tasks = file_list
            .into_iter()
            .filter(|index_file_listing| self.file_name_date_after(start_date, index_file_listing))
            .map(|key| {
                async move {
                    // Fetch the file
                    self.s3_client.get_text_file(s3_bucket, &key).await
                }
            })
            .collect::<Vec<_>>();

        // Execute all tasks in parallel and wait for completion
        let file_contents: Vec<String> = try_join_all(fetch_and_parse_tasks).await?;
        Ok(file_contents
            .into_iter()
            .filter(|file_contents| !file_contents.is_empty())
            .collect::<Vec<String>>())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use mockall::predicate::*;

    #[tokio::test]
    async fn fetches_metadata_from_s3() {
        let mut mock_s3_client = crate::s3_client::MockS3ClientTrait::new();

        mock_s3_client
            .expect_get_text_file()
            .with(eq(DELTA_LAKE_BUCKET.to_string()), eq(LATEST_BLOCK_METADATA_KEY.to_string()))
            .returning(|_bucket, _prefix| Box::pin(async move { Ok("{ \"last_indexed_block\": \"106309326\", \"first_indexed_block\": \"106164983\", \"last_indexed_block_date\": \"2023-11-22\", \"first_indexed_block_date\": \"2023-11-21\", \"processed_at_utc\": \"2023-11-22 23:06:24.358000\" }".to_string()) }));

        let delta_lake_client = DeltaLakeClient::new(mock_s3_client);

        let latest_block_metadata = delta_lake_client.get_latest_block_metadata().await.unwrap();

        assert_eq!(
            latest_block_metadata,
            LatestBlockMetadata {
                last_indexed_block: "106309326".to_string(),
                first_indexed_block: "106164983".to_string(),
                last_indexed_block_date: "2023-11-22".to_string(),
                first_indexed_block_date: "2023-11-21".to_string(),
                processed_at_utc: "2023-11-22 23:06:24.358000".to_string(),
            }
        )
    }
}
